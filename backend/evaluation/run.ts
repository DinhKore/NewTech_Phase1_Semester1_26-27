/**
 * Runs the 20 evaluation cases against the real RAG pipeline (no HTTP, no auth) for one user.
 *
 *   npm run evaluate -- --user=you@gmail.com [--label=before-prompt-v2] [--delay=1200]
 *
 * The user must have logged in once and uploaded the document(s) to evaluate against.
 * A JSON report is written to evaluation/results/ so runs can be compared (before/after an improvement).
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { loadConfig } from '../src/config/env';
import { BACKEND_ROOT } from '../src/config/paths';
import { buildContainer } from '../src/container';
import { PromptNames } from '../src/infrastructure/prompts/prompt-repository';
import { Logger } from '../src/shared/logger/logger';
import { EVALUATION_CASES, judge } from './cases';

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });

  const email = readArg('user')?.toLowerCase();
  if (!email) {
    console.error('Usage: npm run evaluate -- --user=<email> [--label=<name>] [--delay=<ms>]');
    process.exit(1);
  }
  const label = readArg('label') ?? 'run';
  const delayMs = Number(readArg('delay') ?? 1200);

  const config = loadConfig();
  const container = buildContainer(config, new Logger('warn', true));
  try {
    const user = container.userRepository.findByEmail(email);
    if (!user) {
      console.error(`No user "${email}". Log in once through the web app and upload a document first.`);
      process.exit(1);
    }
    if (container.vectorIndex.countForUser(user.id) === 0) {
      console.error(`User "${email}" has no indexed documents. Upload a PDF first.`);
      process.exit(1);
    }

    console.log(`Running ${EVALUATION_CASES.length} cases for ${email} (prompts: ${JSON.stringify(PromptNames)})\n`);

    const results: Array<Record<string, unknown>> = [];
    let passed = 0;

    for (const testCase of EVALUATION_CASES) {
      const startedAt = Date.now();
      let verdict;
      let answer = '';
      try {
        const result = await container.chatService.ask(user, testCase.question);
        answer = result.answer;
        verdict = judge(testCase, result);
      } catch (error) {
        verdict = { pass: false, reason: `error: ${error instanceof Error ? error.message : String(error)}` };
      }

      if (verdict.pass) passed += 1;
      console.log(
        `${verdict.pass ? 'PASS' : 'FAIL'} #${String(testCase.id).padStart(2, '0')} [${testCase.group}] ${
          verdict.reason ? `- ${verdict.reason}` : ''
        }`,
      );
      results.push({
        id: testCase.id,
        group: testCase.group,
        question: testCase.question,
        pass: verdict.pass,
        reason: verdict.reason ?? null,
        answer,
        latencyMs: Date.now() - startedAt,
      });
      await sleep(delayMs); // stay under provider rate limits
    }

    const passRate = Number(((passed / EVALUATION_CASES.length) * 100).toFixed(1));
    console.log(`\nResult: ${passed}/${EVALUATION_CASES.length} passed (${passRate}%)`);

    const resultsDir = path.join(BACKEND_ROOT, 'evaluation', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });
    const reportPath = path.join(resultsDir, `${new Date().toISOString().replace(/[:.]/g, '-')}_${label}.json`);
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ label, user: email, prompts: PromptNames, passed, total: EVALUATION_CASES.length, passRate, results }, null, 2),
    );
    console.log(`Report saved to ${reportPath}`);
  } finally {
    container.dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
