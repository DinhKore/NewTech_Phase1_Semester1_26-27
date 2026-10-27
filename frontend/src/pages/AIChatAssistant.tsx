import { useState, useEffect } from 'react';

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

const AIChatAssistant = () => {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: 'Xin chào! Tôi là Trợ lý AI. Dữ liệu chat của bạn sẽ được lưu vĩnh viễn.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // KÉO DỮ LIỆU TỪ SQLITE LÊN KHI VỪA MỞ TRANG (HOẶC F5 / RELOAD)
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/history/chat');
                if (response.ok) {
                    const data = await response.json();
                    if (data.history && data.history.length > 0) {
                        setMessages(data.history); // Nạp lại toàn bộ lịch sử đã lưu
                    }
                }
            } catch (err) {
                console.error("Không thể tải lịch sử chat cũ.");
            }
        };

        fetchChatHistory();
    }, []);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userQuestion = input;
        setMessages(prev => [...prev, { sender: 'user', text: userQuestion }]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userQuestion })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Lỗi khi AI xử lý câu hỏi.");
            } else {
                setMessages(prev => [...prev, {
                    sender: 'ai',
                    text: data.answer,
                    sources: data.sources
                }]);
            }
        } catch (err) {
            setError("Không thể kết nối đến máy chủ Backend.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* KHU VỰC HIỂN THỊ TIN NHẮN */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8fafc' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        background: msg.sender === 'ai' ? '#e0f2fe' : '#dcfce3',
                        padding: '15px',
                        borderRadius: '8px',
                        maxWidth: '80%',
                        marginBottom: '15px',
                        marginLeft: msg.sender === 'user' ? 'auto' : '0'
                    }}>
                        <b style={{ color: msg.sender === 'ai' ? '#0369a1' : '#166534' }}>
                            {msg.sender === 'ai' ? '🤖 Trợ lý AI:' : '🧑 Bạn:'}
                        </b>
                        <p style={{ marginTop: '5px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.text}</p>

                        {msg.sources && msg.sources.length > 0 && (
                            <div style={{ marginTop: '12px', fontSize: '13px', borderTop: '1px solid #bae6fd', paddingTop: '10px' }}>
                                <strong style={{ color: '#0284c7' }}>📚 Nguồn tham khảo:</strong>
                                <ul style={{ paddingLeft: '20px', margin: '5px 0 0 0', color: '#334155' }}>
                                    {msg.sources.map(src => (
                                        <li key={src.id} style={{ marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#0369a1' }}>[{src.score}]</span> <i>"{src.snippet}"</i>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', maxWidth: '70%', marginBottom: '15px', color: '#64748b' }}>
                        <i>⏳ AI đang đọc tài liệu và suy nghĩ...</i>
                    </div>
                )}

                {error && (
                    <div style={{ background: '#fee2e2', padding: '15px', borderRadius: '8px', maxWidth: '70%', marginBottom: '15px', color: '#ef4444', fontWeight: 'bold' }}>
                        ❌ {error}
                    </div>
                )}
            </div>

            {/* KHU VỰC NHẬP DỮ LIỆU */}
            <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Hỏi AI về tài liệu..."
                    disabled={isLoading}
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px' }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    style={{
                        background: (isLoading || !input.trim()) ? '#94a3b8' : '#10b981',
                        color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px',
                        cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer', fontWeight: 'bold'
                    }}
                >
                    {isLoading ? 'Đang gửi...' : 'Gửi'}
                </button>
            </div>
        </div>
    );
};

export default AIChatAssistant;