import type { Response } from 'express';

/** Writes Server-Sent Events: each payload is one `data: <json>` frame. */
export class SseWriter {
  private readonly res: Response;

  constructor(res: Response) {
    this.res = res;
  }

  open(): void {
    this.res.status(200);
    this.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering (nginx)
    this.res.flushHeaders();
  }

  send(payload: unknown): void {
    if (this.res.writableEnded || this.res.destroyed) return;
    this.res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  close(): void {
    if (!this.res.writableEnded) this.res.end();
  }
}
