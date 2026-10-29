import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingBlock } from '../../shared/components/LoadingBlock';
import { Modal } from '../../shared/components/Modal';
import { PageHeader } from '../../shared/components/PageHeader';
import { Pagination } from '../../shared/components/Pagination';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { formatBytes, formatDateTime } from '../../shared/utils/format';
import { documentsApi } from './documents.api';
import type { DocumentItem, DocumentPagination } from './documents.types';
import './documents.css';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pagination, setPagination] = useState<DocumentPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async (page: number, searchVal: string) => {
    setLoading(true);
    try {
      const data = await documentsApi.list({ page, limit: 10, search: searchVal.trim() || undefined });
      setDocuments(data.items);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments(1, debouncedSearch);
  }, [fetchDocuments, debouncedSearch]);

  const handlePageChange = (page: number) => {
    fetchDocuments(page, debouncedSearch);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Hệ thống chỉ hỗ trợ định dạng file PDF.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Đang tải lên và xử lý ${file.name}...`);
    try {
      await documentsApi.upload(file);
      toast.success(`Đã thêm và phân tích tài liệu "${file.name}" thành công!`, { id: toastId });
      fetchDocuments(1, debouncedSearch);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tải lên tài liệu thất bại.';
      toast.error(message, { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await documentsApi.delete(docToDelete.id);
      toast.success(`Đã xóa tài liệu "${docToDelete.filename}".`);
      setDocToDelete(null);
      fetchDocuments(pagination.page, debouncedSearch);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xóa tài liệu thất bại.';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="documents-container">
      <PageHeader
        title="Quản lý Tài liệu Học tập"
        description="Tải lên tài liệu PDF của môn học để hệ thống tự động phân tích, trích xuất chunk và tạo vector embeddings phục vụ Hỏi đáp và Trắc nghiệm."
      />

      {/* Upload Drop Zone */}
      <div
        className={`documents-upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="application/pdf"
          style={{ display: 'none' }}
        />
        <div className="upload-icon">📄</div>
        <p className="upload-prompt">
          {uploading ? 'Đang phân tích và xử lý PDF...' : 'Kéo thả file PDF vào đây hoặc bấm để chọn tệp'}
        </p>
        <span className="upload-hint">Chỉ chấp nhận tệp định dạng .pdf (Tối đa 15MB)</span>
      </div>

      {/* Filter and Search */}
      <div className="documents-controls">
        <div className="search-box">
          <span className="search-box-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-muted text-sm">
          Tổng cộng: <strong>{pagination.total}</strong> tài liệu
        </span>
      </div>

      {/* Documents Table */}
      {loading ? (
        <LoadingBlock message="Đang tải danh sách tài liệu..." />
      ) : documents.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'Không tìm thấy tài liệu phù hợp' : 'Chưa có tài liệu nào'}
          description={
            debouncedSearch
              ? `Không có tài liệu nào chứa từ khóa "${debouncedSearch}".`
              : 'Hãy tải lên file bài giảng hoặc slide PDF đầu tiên để bắt đầu học tập cùng AI!'
          }
        />
      ) : (
        <>
          <div className="documents-table-wrapper">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>Tên tài liệu</th>
                  <th>Dung lượng</th>
                  <th>Số đoạn (Chunks)</th>
                  <th>Thời gian tải lên</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="doc-name-cell">
                        <span className="doc-pdf-icon">📕</span>
                        <span>{doc.filename}</span>
                      </div>
                    </td>
                    <td>{formatBytes(doc.sizeBytes)}</td>
                    <td>
                      <span className="badge badge-info">{doc.chunksCount} chunks</span>
                    </td>
                    <td>{formatDateTime(doc.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="delete-btn"
                        title="Xóa tài liệu"
                        onClick={() => setDocToDelete(doc)}
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Confirmation Modal for Document Deletion */}
      <Modal
        isOpen={Boolean(docToDelete)}
        title="Xác nhận xóa tài liệu"
        onClose={() => !deleting && setDocToDelete(null)}
      >
        <p>
          Bạn có chắc chắn muốn xóa tài liệu <strong>{docToDelete?.filename}</strong> không?
        </p>
        <p className="text-sm text-muted mt-2">
          Hành động này sẽ xóa toàn bộ các đoạn văn bản (chunks) và vector embeddings liên quan khỏi cơ sở dữ liệu.
        </p>
        <div className="modal-actions mt-4">
          <button
            className="btn btn-secondary"
            onClick={() => setDocToDelete(null)}
            disabled={deleting}
          >
            Hủy
          </button>
          <button
            className="btn btn-danger"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
