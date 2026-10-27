import { useState, useEffect, useRef } from 'react';

// Cấu trúc tài liệu khớp với bảng SQLite
interface UploadedDoc {
    id: number;
    filename: string;
    chunks_count: number;
    uploaded_at: string;
}

const DocumentManager = () => {
    const [documents, setDocuments] = useState<UploadedDoc[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Hàm kéo danh sách file từ SQLite
    const fetchDocuments = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/documents');
            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents || []);
            }
        } catch (err) {
            console.error("Không thể tải danh sách tài liệu.");
        }
    };

    // 2. Chạy ngay khi mở trang hoặc F5 (Reload)
    useEffect(() => {
        fetchDocuments();
    }, []);

    // 3. Xử lý Upload file
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('document', file);

        try {
            const response = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Lỗi server khi xử lý file PDF");
            } else {
                setSuccess(`Đã nạp thành công: ${data.fileName} (${data.chunksCount} đoạn Vector)`);
                // Tải lại danh sách tài liệu mới từ database
                fetchDocuments();
            }
        } catch (err) {
            setError("Không thể kết nối đến máy chủ Backend.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, color: '#1e293b' }}>📚 Kho Tài Liệu Bài Giảng</h2>
            <p style={{ color: '#64748b' }}>Tải lên các file PDF để hệ thống băm nhỏ và nạp Vector vào RAM.</p>

            {/* Khu vực Upload */}
            <div style={{ border: '2px dashed #cbd5e1', padding: '30px', textAlign: 'center', borderRadius: '8px', margin: '20px 0' }}>
                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                <button
                    onClick={triggerFileInput}
                    disabled={isLoading}
                    style={{
                        background: isLoading ? '#94a3b8' : '#3b82f6',
                        color: 'white', border: 'none', padding: '10px 20px',
                        borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isLoading ? '⏳ Đang băm dữ liệu Vector...' : '+ Chọn và Tải PDF Lên'}
                </button>

                {error && <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '15px' }}>❌ {error}</p>}
                {success && <p style={{ color: '#10b981', fontWeight: 'bold', marginTop: '15px' }}>✅ {success}</p>}
            </div>

            {/* Khu vực Hiển thị Danh sách File đã lưu trong SQLite */}
            <div style={{ marginTop: '30px' }}>
                <h3 style={{ color: '#334155', marginBottom: '15px' }}>
                    📑 Tài liệu đã lưu trữ ({documents.length})
                </h3>

                {documents.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Chưa có tài liệu nào trong Database. Hãy tải lên file PDF đầu tiên!
                    </div>
                ) : (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px' }}>#</th>
                                    <th style={{ padding: '12px 16px' }}>Tên File</th>
                                    <th style={{ padding: '12px 16px' }}>Số đoạn Vector</th>
                                    <th style={{ padding: '12px 16px' }}>Thời gian tải lên</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc, index) => (
                                    <tr key={doc.id} style={{ borderBottom: index < documents.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{index + 1}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#1e293b' }}>📄 {doc.filename}</td>
                                        <td style={{ padding: '12px 16px', color: '#0369a1' }}>{doc.chunks_count} chunks</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(doc.uploaded_at).toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentManager;