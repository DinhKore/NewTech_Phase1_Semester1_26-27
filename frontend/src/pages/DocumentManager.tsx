// frontend/src/pages/DocumentManager.tsx
const DocumentManager = () => {
    return (
        <div style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, color: '#1e293b' }}>📚 Kho Tài Liệu Bài Giảng</h2>
            <p style={{ color: '#64748b' }}>Tải lên các file PDF/Docx để AI có thể đọc và hỗ trợ bạn học tập.</p>

            <div style={{ border: '2px dashed #cbd5e1', padding: '40px', textAlign: 'center', borderRadius: '8px', margin: '20px 0' }}>
                <p style={{ color: '#94a3b8', fontSize: '18px' }}>Trạng thái: Chưa có tài liệu nào</p>
                <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + Tải File Lên (Mock UI)
                </button>
            </div>
        </div>
    );
};

export default DocumentManager;