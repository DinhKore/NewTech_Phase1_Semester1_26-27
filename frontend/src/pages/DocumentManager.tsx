import { useState, useRef } from 'react';

const DocumentManager = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset state và bật Loading
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        // Gói file vào FormData với key "document" để khớp với Multer ở Backend
        const formData = new FormData();
        formData.append('document', file);

        try {
            // Gửi request POST tới API Upload
            const response = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Lỗi server khi xử lý file PDF");
            } else {
                setSuccess(`Đã nạp thành công: ${data.fileName} (${data.chunksCount} đoạn Vector)`);
            }
        } catch (err) {
            setError("Không thể kết nối đến máy chủ Backend.");
        } finally {
            setIsLoading(false);
            // Xóa bộ nhớ đệm của thẻ input để có thể chọn lại cùng một file
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

            <div style={{ border: '2px dashed #cbd5e1', padding: '40px', textAlign: 'center', borderRadius: '8px', margin: '20px 0' }}>
                {/* Thẻ input ẩn để chọn file */}
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

                {/* Trạng thái UI */}
                {error && <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '15px' }}>❌ {error}</p>}
                {success && <p style={{ color: '#10b981', fontWeight: 'bold', marginTop: '15px' }}>✅ {success}</p>}
            </div>
        </div>
    );
};

export default DocumentManager;