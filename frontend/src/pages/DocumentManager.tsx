// frontend/src/pages/DocumentManager.tsx
import { useState } from 'react';

// Định nghĩa cấu trúc dữ liệu của một tài liệu
interface Document {
    id: string;
    name: string;
    date: string;
    size: string;
}

// Khởi tạo Mock Data (Task 1)
const mockDocuments: Document[] = [
    { id: '1', name: 'BaiGiang_NewTech_Chuong1.pdf', date: '22/10/2026', size: '2.5 MB' },
    { id: '2', name: 'TaiLieu_ThamKhao_RAG.docx', date: '21/10/2026', size: '1.2 MB' }
];

const DocumentManager = () => {
    // Khởi tạo các State quản lý giao diện (Task 2)
    const [documents, setDocuments] = useState<Document[]>(mockDocuments);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Hàm giả lập xử lý tải file lên
    const handleUploadMock = () => {
        // 1. Đặt lại trạng thái ban đầu và bật Loading
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        // 2. Giả lập gọi API tốn 1.5 giây
        setTimeout(() => {
            setIsLoading(false);

            // Giả lập Validation: Random 50% ra lỗi file > 5MB để test giao diện
            const isOversized = Math.random() > 0.5;

            if (isOversized) {
                setError("Lỗi: File tải lên vượt quá giới hạn 5MB!");
            } else {
                setSuccess("Tải tài liệu lên thành công!");
                // Thêm một file giả vào đầu danh sách
                const newDoc: Document = {
                    id: Date.now().toString(),
                    name: 'TaiLieu_Moi_Upload.pdf',
                    date: new Date().toLocaleDateString('vi-VN'),
                    size: '3.1 MB'
                };
                setDocuments([newDoc, ...documents]);
            }
        }, 1500);
    };

    // Hàm giả lập xóa file
    const handleDelete = (id: string) => {
        setDocuments(documents.filter(doc => doc.id !== id));
        setSuccess("Đã xóa tài liệu thành công.");
        setError(null);
    };

    return (
        <div style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, color: '#1e293b' }}>📚 Kho Tài Liệu Bài Giảng</h2>
            <p style={{ color: '#64748b' }}>Tải lên các file PDF/Docx để AI có thể đọc và hỗ trợ bạn học tập.</p>

            {/* Khu vực Upload */}
            <div style={{ border: '2px dashed #cbd5e1', padding: '40px', textAlign: 'center', borderRadius: '8px', margin: '20px 0' }}>
                <button
                    onClick={handleUploadMock}
                    disabled={isLoading}
                    style={{
                        background: isLoading ? '#94a3b8' : '#3b82f6',
                        color: 'white', border: 'none', padding: '10px 20px',
                        borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isLoading ? '⏳ Đang tải lên...' : '+ Tải File Lên (Mock UI)'}
                </button>

                {/* Hiển thị trạng thái Error / Success */}
                {error && <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '15px' }}>❌ {error}</p>}
                {success && <p style={{ color: '#10b981', fontWeight: 'bold', marginTop: '15px' }}>✅ {success}</p>}
            </div>

            {/* Khu vực hiển thị danh sách tài liệu */}
            <div>
                <h3 style={{ color: '#334155' }}>Tài liệu đã tải lên ({documents.length})</h3>
                {documents.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Trạng thái: Trống (Empty State)</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {documents.map((doc) => (
                            <li key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #e2e8f0' }}>
                                <div>
                                    <strong style={{ color: '#0f172a' }}>{doc.name}</strong>
                                    <div style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>Ngày tải: {doc.date} • Dung lượng: {doc.size}</div>
                                </div>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', height: 'fit-content' }}
                                >
                                    Xóa
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DocumentManager;