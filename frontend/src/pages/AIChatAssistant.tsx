// frontend/src/pages/AIChatAssistant.tsx
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

interface Source {
    id: number;
    score: string;
    snippet: string;
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
    sources?: Source[];
}

const QUICK_PROMPTS = [
    "📖 Tóm tắt nội dung chính của tài liệu trong 3 câu",
    "🎯 Các quy định hoặc bước quan trọng cần lưu ý là gì?",
    "❓ Tạo 2 câu hỏi ôn tập dựa trên tài liệu này",
    "⏰ Có những mốc thời gian hoặc lịch trình nào được nêu?"
];

const AIChatAssistant = () => {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: 'Xin chào! Tôi là Trợ lý AI. Dữ liệu tài liệu của bạn đã sẵn sàng để tra cứu.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [openSources, setOpenSources] = useState<{ [key: number]: boolean }>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/history/chat');
                if (response.ok) {
                    const data = await response.json();
                    if (data.history && data.history.length > 0) {
                        setMessages(data.history);
                    }
                }
            } catch (err) {
                console.error("Không thể tải lịch sử chat.");
            }
        };
        fetchChatHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const toggleSource = (idx: number) => {
        setOpenSources(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const handleSendMessage = async (textToSend?: string) => {
        const query = textToSend || input;
        if (!query.trim() || isLoading) return;

        const userQuestion = query.trim();
        setMessages(prev => [...prev, { sender: 'user', text: userQuestion }]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userQuestion })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Lỗi khi AI xử lý câu hỏi.");
                setMessages(prev => [...prev, {
                    sender: 'ai',
                    text: `⚠️ **Lỗi:** ${data.error || 'Hệ thống không thể xử lý câu hỏi lúc này.'}`
                }]);
            } else {
                setMessages(prev => [...prev, {
                    sender: 'ai',
                    text: data.answer,
                    sources: data.sources
                }]);
            }
        } catch (err) {
            toast.error("Không thể kết nối đến máy chủ Backend.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '82vh', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>

            {/* KHU VỰC TIN NHẮN */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: msg.sender === 'user' ? '75%' : '85%',
                            background: msg.sender === 'user' ? '#0284c7' : 'white',
                            color: msg.sender === 'user' ? 'white' : '#1e293b',
                            padding: '16px 20px',
                            borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                            lineHeight: '1.6',
                            fontSize: '15px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: msg.sender === 'user' ? '#bae6fd' : '#0369a1' }}>
                            <span>{msg.sender === 'user' ? '🧑 Bạn' : '🤖 Trợ lý AI'}</span>
                        </div>

                        {/* RENDER NỘI DUNG VĂN BẢN VỚI REACT-MARKDOWN */}
                        {msg.sender === 'ai' ? (
                            <div style={{ fontSize: '15px' }} className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        )}

                        {/* NGUỒN TRÍCH DẪN DẠNG COLLAPSIBLE CARD */}
                        {msg.sources && msg.sources.length > 0 && (
                            <div style={{ marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                <button
                                    onClick={() => toggleSource(idx)}
                                    style={{
                                        background: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#0369a1',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>📚 {openSources[idx] ? 'Ẩn nguồn tham khảo' : `Xem ${msg.sources.length} đoạn trích dẫn nguồn`}</span>
                                    <span>{openSources[idx] ? '▲' : '▼'}</span>
                                </button>

                                {openSources[idx] && (
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {msg.sources.map(src => {
                                            const numericScore = parseFloat(src.score) || 0;
                                            return (
                                                <div key={src.id} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#0284c7' }}>Trích đoạn #{src.id}</span>
                                                        <span style={{ fontWeight: 'bold', color: numericScore >= 50 ? '#16a34a' : '#d97706' }}>
                                                            Độ tương đồng: {src.score}
                                                        </span>
                                                    </div>

                                                    {/* Progress bar Cosine */}
                                                    <div style={{ height: '5px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                                                        <div style={{ height: '100%', width: `${Math.min(100, numericScore)}%`, background: numericScore >= 50 ? '#22c55e' : '#f59e0b' }} />
                                                    </div>

                                                    <div style={{ fontStyle: 'italic', color: '#475569' }}>
                                                        "{src.snippet}"
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div style={{ alignSelf: 'flex-start', background: 'white', padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                        <span>AI đang đối chiếu vector và tổng hợp câu trả lời...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* QUICK PROMPT CHIPS */}
            <div style={{ padding: '8px 20px', background: '#f1f5f9', display: 'flex', gap: '8px', overflowX: 'auto', borderTop: '1px solid #e2e8f0' }}>
                {QUICK_PROMPTS.map((prompt, pIdx) => (
                    <button
                        key={pIdx}
                        onClick={() => handleSendMessage(prompt)}
                        disabled={isLoading}
                        style={{
                            whiteSpace: 'nowrap',
                            background: 'white',
                            border: '1px solid #cbd5e1',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            color: '#334155',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0284c7'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            {/* INPUT KHUNG CHAT VỚI PHÍM TẮT & ICON GỬI */}
            <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập câu hỏi (Enter để gửi, Shift + Enter để xuống dòng)..."
                    disabled={isLoading}
                    rows={2}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        resize: 'none',
                        outline: 'none',
                        lineHeight: '1.4'
                    }}
                />
                <button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !input.trim()}
                    style={{
                        height: '46px',
                        padding: '0 20px',
                        background: (isLoading || !input.trim()) ? '#94a3b8' : '#0284c7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.2s'
                    }}
                >
                    {isLoading ? '...' : (
                        <>
                            <span>Gửi</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AIChatAssistant;