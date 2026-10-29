import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingBlock } from '../../shared/components/LoadingBlock';
import { Modal } from '../../shared/components/Modal';
import { formatPercent } from '../../shared/utils/format';
import { chatApi } from './chat.api';
import type { ChatMessage, ChatSession, ChatSource } from './chat.types';
import './chat.css';

const QUICK_PROMPTS = [
  'Tóm tắt các điểm cốt lõi trong tài liệu đã tải lên',
  'Giải thích các khái niệm quan trọng nhất',
  'So sánh các phương pháp được đề cập trong bài',
  'Tạo danh sách các câu hỏi thường gặp',
];

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Rename session state
  const [sessionToRename, setSessionToRename] = useState<ChatSession | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Delete session state
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

  // Accordion open/close state for sources per message id
  const [openSources, setOpenSources] = useState<Record<number, boolean>>({});

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const userScrolledUpRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
      userScrolledUpRef.current = false;
      setShowScrollBottom(false);
    }
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isUp = distanceToBottom > 120;
    userScrolledUpRef.current = isUp;
    setShowScrollBottom(isUp);
  };

  // Load sessions on mount
  useEffect(() => {
    let mounted = true;
    chatApi
      .listSessions()
      .then((data) => {
        if (!mounted) return;
        setSessions(data);
        if (data.length > 0) {
          setActiveSessionId(data[0].id);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Không thể tải danh sách phiên chat.';
        toast.error(msg);
      })
      .finally(() => {
        if (mounted) setLoadingSessions(false);
      });

    return () => {
      mounted = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    let mounted = true;
    setLoadingMessages(true);
    chatApi
      .listMessages(activeSessionId)
      .then((data) => {
        if (mounted) setMessages(data);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử trò chuyện.';
        toast.error(msg);
      })
      .finally(() => {
        if (mounted) setLoadingMessages(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeSessionId]);

  // Scroll to bottom when messages update, unless the user deliberately scrolled up to review older messages
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  // When active session changes or loading finishes, scroll to bottom
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      userScrolledUpRef.current = false;
      setShowScrollBottom(false);
      setTimeout(() => scrollToBottom('auto'), 50);
    }
  }, [activeSessionId, loadingMessages]);

  const handleCreateSession = async () => {
    try {
      const session = await chatApi.createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo phiên chat mới thất bại.';
      toast.error(msg);
    }
  };

  const handleRenameConfirm = async () => {
    if (!sessionToRename || !newTitle.trim()) return;
    try {
      const updated = await chatApi.renameSession(sessionToRename.id, newTitle.trim());
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success('Đã đổi tên cuộc trò chuyện.');
      setSessionToRename(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi tên thất bại.';
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    try {
      await chatApi.deleteSession(sessionToDelete.id);
      const remaining = sessions.filter((s) => s.id !== sessionToDelete.id);
      setSessions(remaining);
      if (activeSessionId === sessionToDelete.id) {
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('Đã xóa cuộc trò chuyện.');
      setSessionToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa thất bại.';
      toast.error(msg);
    }
  };

  const toggleSources = (messageId: number) => {
    setOpenSources((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const handleSend = async (questionText?: string) => {
    const text = (questionText ?? input).trim();
    if (!text || isStreaming) return;

    setInput('');

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      sessionId: activeSessionId ?? '',
      role: 'user',
      content: text,
      sources: [],
      createdAt: new Date().toISOString(),
    };

    // Temporary placeholder for assistant streaming response
    const tempAssistantMsgId = Date.now() + 1;
    const tempAssistantMsg: ChatMessage = {
      id: tempAssistantMsgId,
      sessionId: activeSessionId ?? '',
      role: 'assistant',
      content: '',
      sources: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsStreaming(true);
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
    setTimeout(() => scrollToBottom('smooth'), 40);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let targetSessionId = activeSessionId ?? undefined;
    let accumulatedContent = '';
    let sourcesList: ChatSource[] = [];

    try {
      const eventStream = chatApi.streamMessage(text, targetSessionId, abortController.signal);

      for await (const event of eventStream) {
        if (event.type === 'session') {
          targetSessionId = event.sessionId;
          // If this was a new session created on the fly
          if (!activeSessionId) {
            setActiveSessionId(event.sessionId);
            chatApi.listSessions().then(setSessions).catch(() => {});
          }
        } else if (event.type === 'sources') {
          sourcesList = event.sources;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantMsgId ? { ...msg, sources: sourcesList } : msg,
            ),
          );
        } else if (event.type === 'chunk') {
          accumulatedContent += event.text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantMsgId ? { ...msg, content: accumulatedContent } : msg,
            ),
          );
        } else if (event.type === 'done') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantMsgId
                ? { ...msg, id: event.messageId, content: accumulatedContent }
                : msg,
            ),
          );
        } else if (event.type === 'error') {
          toast.error(event.message);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Ignored on user cancel
      } else {
        const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo phản hồi.';
        toast.error(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantMsgId && !m.content
              ? { ...m, content: '*(Không thể tạo phản hồi do lỗi kết nối)*' }
              : m,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="chat-layout">
      {/* Sidebar: Session List */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn btn-primary new-chat-btn" onClick={handleCreateSession}>
            <span>➕</span> Cuộc trò chuyện mới
          </button>
        </div>

        <div className="chat-sessions-list">
          {loadingSessions ? (
            <LoadingBlock message="Đang tải danh sách..." />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted text-center p-4">Chưa có cuộc trò chuyện nào.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`chat-session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <span className="chat-session-title">💬 {session.title}</span>
                <div className="chat-session-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="session-action-btn"
                    title="Đổi tên"
                    onClick={() => {
                      setSessionToRename(session);
                      setNewTitle(session.title);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="session-action-btn"
                    title="Xóa"
                    onClick={() => setSessionToDelete(session)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Conversation Area */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-title">
            {activeSession ? `💬 ${activeSession.title}` : 'Trợ lý Học tập AI'}
          </div>
          {isStreaming && (
            <span className="badge badge-warning">Đang tạo câu trả lời...</span>
          )}
        </div>

        <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
          {loadingMessages ? (
            <LoadingBlock message="Đang tải lịch sử trò chuyện..." />
          ) : messages.length === 0 ? (
            <EmptyState
              title="Bắt đầu thảo luận về tài liệu của bạn"
              description="Đặt câu hỏi về nội dung bài học, tài liệu PDF đã tải lên hoặc sử dụng các gợi ý nhanh bên dưới."
            />
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content-wrapper">
                  <div className="message-bubble">
                    {msg.role === 'assistant' ? (
                      <div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || (isStreaming ? ' ' : '*(Không có nội dung)*')}
                        </ReactMarkdown>
                        {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                          <span className="typing-cursor" />
                        )}
                      </div>
                    ) : (
                      <div>{msg.content}</div>
                    )}
                  </div>

                  {/* Sources Citations Accordion */}
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1">
                      <button
                        className="chat-sources-toggle"
                        onClick={() => toggleSources(msg.id)}
                      >
                        📚 {msg.sources.length} trích dẫn tài liệu{' '}
                        {openSources[msg.id] ? '▲' : '▼'}
                      </button>

                      {openSources[msg.id] && (
                        <div className="chat-sources-container">
                          {msg.sources.map((src) => (
                            <div key={src.index} className="source-item">
                              <div className="source-header">
                                <span>
                                  [{src.index}] {src.filename}{' '}
                                  {src.pageNumber ? `(Trang ${src.pageNumber})` : ''}
                                </span>
                                <span className="badge badge-neutral">
                                  Độ khớp: {formatPercent(src.score)}
                                </span>
                              </div>
                              <p className="source-snippet">"{src.snippet}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {showScrollBottom && (
          <button
            type="button"
            className="scroll-to-bottom-btn"
            onClick={() => scrollToBottom('smooth')}
            aria-label="Cuộn xuống tin nhắn mới nhất"
          >
            ⬇ Xuống tin nhắn mới
          </button>
        )}

        {/* Input Footer Area */}
        <div className="chat-input-area">
          {messages.length === 0 && (
            <div className="quick-prompts-bar">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  className="quick-prompt-btn"
                  onClick={() => handleSend(prompt)}
                  disabled={isStreaming}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-form">
            <textarea
              className="chat-textarea"
              placeholder="Nhập câu hỏi của bạn (Nhấn Enter để gửi, Shift+Enter để xuống dòng)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleSend()}
              disabled={isStreaming || !input.trim()}
            >
              {isStreaming ? 'Đang gửi...' : 'Gửi ➤'}
            </button>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={Boolean(sessionToRename)}
        title="Đổi tên cuộc trò chuyện"
        onClose={() => setSessionToRename(null)}
      >
        <div className="form-group">
          <label className="form-label">Tiêu đề cuộc trò chuyện</label>
          <input
            type="text"
            className="form-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nhập tên mới..."
            autoFocus
          />
        </div>
        <div className="modal-actions mt-4">
          <button className="btn btn-secondary" onClick={() => setSessionToRename(null)}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={handleRenameConfirm} disabled={!newTitle.trim()}>
            Lưu thay đổi
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        title="Xóa cuộc trò chuyện"
        onClose={() => setSessionToDelete(null)}
      >
        <p>
          Bạn có chắc chắn muốn xóa cuộc trò chuyện <strong>{sessionToDelete?.title}</strong> không?
        </p>
        <p className="text-sm text-muted mt-2">
          Toàn bộ lịch sử tin nhắn trong cuộc trò chuyện này sẽ bị xóa vĩnh viễn.
        </p>
        <div className="modal-actions mt-4">
          <button className="btn btn-secondary" onClick={() => setSessionToDelete(null)}>
            Hủy
          </button>
          <button className="btn btn-danger" onClick={handleDeleteConfirm}>
            Xác nhận xóa
          </button>
        </div>
      </Modal>
    </div>
  );
}
