import type { Request, Response } from 'express';
import { SseWriter } from '../../http/sse-writer';
import { requireUser } from '../auth/auth.middleware';
import type { ChatService } from './chat.service';
import {
  CreateSessionBodySchema,
  RenameSessionBodySchema,
  SessionIdParamsSchema,
  StreamChatBodySchema,
} from './chat.schemas';

export class ChatController {
  private readonly chatService: ChatService;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
  }

  listSessions = (req: Request, res: Response): void => {
    res.status(200).json({ sessions: this.chatService.listSessions(requireUser(req)) });
  };

  createSession = (req: Request, res: Response): void => {
    const { title } = CreateSessionBodySchema.parse(req.body ?? {});
    res.status(201).json({ session: this.chatService.createSession(requireUser(req), title) });
  };

  renameSession = (req: Request, res: Response): void => {
    const { id } = SessionIdParamsSchema.parse(req.params);
    const { title } = RenameSessionBodySchema.parse(req.body);
    res.status(200).json({ session: this.chatService.renameSession(requireUser(req), id, title) });
  };

  deleteSession = (req: Request, res: Response): void => {
    const { id } = SessionIdParamsSchema.parse(req.params);
    this.chatService.deleteSession(requireUser(req), id);
    res.status(204).end();
  };

  listMessages = (req: Request, res: Response): void => {
    const { id } = SessionIdParamsSchema.parse(req.params);
    res.status(200).json({ messages: this.chatService.listMessages(requireUser(req), id) });
  };

  /** POST /api/chat/stream: Server-Sent Events. Validation errors are returned as normal JSON errors. */
  stream = async (req: Request, res: Response): Promise<void> => {
    const user = requireUser(req);
    const body = StreamChatBodySchema.parse(req.body);
    const turn = await this.chatService.startTurn(user, body);

    const sse = new SseWriter(res);
    sse.open();

    let clientClosed = false;
    res.on('close', () => {
      clientClosed = true;
    });

    try {
      sse.send({ type: 'session', sessionId: turn.sessionId });
      for await (const event of turn.events) {
        if (clientClosed) break; // `break` closes the generator, running its cleanup
        sse.send(event);
      }
    } finally {
      sse.close();
    }
  };
}
