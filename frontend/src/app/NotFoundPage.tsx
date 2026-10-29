import { Link } from 'react-router-dom';
import { EmptyState } from '../shared/components/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="content">
      <EmptyState icon="🧭" title="404 - Không tìm thấy trang">
        <p style={{ marginBottom: 16 }}>Đường dẫn bạn truy cập không tồn tại.</p>
        <Link to="/" className="btn btn-primary">
          Về trang chủ
        </Link>
      </EmptyState>
    </div>
  );
}
