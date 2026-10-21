// frontend/src/pages/AIChatAssistant.tsx
const AIChatAssistant = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Khu vực hiển thị tin nhắn */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8fafc' }}>
                <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '8px', maxWidth: '70%', marginBottom: '15px' }}>
                    <b style={{ color: '#0369a1' }}>🤖 Trợ lý AI:</b> Xin chào! Tôi đã đọc tài liệu của bạn. Bạn muốn tôi tóm tắt hay tạo bài tập trắc nghiệm?
                </div>
            </div>

            {/* Khu vực nhập câu hỏi */}
            <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Hỏi AI về tài liệu... (ví dụ: Tóm tắt chương 1)"
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px' }}
                />
                <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Gửi
                </button>
            </div>
        </div>
    );
};

export default AIChatAssistant;