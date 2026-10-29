import path from 'node:path';
import dotenv from 'dotenv';
import { createApp } from './app';
import { ConfigError, loadConfig, type AppConfig } from './config/env';
import { BACKEND_ROOT } from './config/paths';
import { buildContainer } from './container';
import { Logger, serializeError } from './shared/logger/logger';

function main(): void {
  dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });

  let config: AppConfig;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`\n${error.message}\n\nSee backend/.env.example for the required variables.\n`);
      process.exit(1);
    }
    throw error;
  }

  const logger = new Logger(config.logLevel, !config.isProduction);
  const container = buildContainer(config, logger);
  const app = createApp(container);

  const server = app.listen(config.port, () => {
    logger.info('server started', { port: config.port, env: config.env });
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutting down', { signal });
    server.close(() => {
      container.dispose();
      process.exit(0);
    });
    // Force exit if connections (e.g. SSE streams) do not close in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled promise rejection', { reason: serializeError(reason) });
  });
  process.on('uncaughtException', (error) => {
    logger.error('uncaught exception', { err: error });
    process.exit(1);
  });
}

main();
