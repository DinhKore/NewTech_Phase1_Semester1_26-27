import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { env } from '../../config/env';
import { getErrorMessage } from '../../shared/api/api-error';
import { useAuth } from './useAuth';
import './login.css';

export default function LoginPage() {
  const { status, loginWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (status === 'authenticated') return <Navigate to="/" replace />;

  const handleSuccess = async (credential: string | undefined) => {
    if (!credential) {
      toast.error('Google không trả về thông tin đăng nhập.');
      return;
    }
    setIsSigningIn(true);
    try {
      await loginWithGoogle(credential);
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể đăng nhập, vui lòng thử lại.'));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-badge">
          <span>✨</span> NỀN TẢNG HỌC TẬP THÔNG MINH AI
        </div>

        <div className="login-logo">🎓</div>

        <h1 className="login-title">Course Assistant</h1>
        <p className="login-subtitle">
          Trợ lý AI thế hệ mới: Đọc hiểu giáo trình PDF, giải đáp thắc mắc chuyên sâu và tự động tạo đề thi trắc nghiệm ôn tập.
        </p>

        <div className="login-features-list">
          <span className="login-feature-tag">⚡ RAG Trích xuất</span>
          <span className="login-feature-tag">🤖 Streaming Chat</span>
          <span className="login-feature-tag">📝 Trắc nghiệm Zod</span>
          <span className="login-feature-tag">🛡️ Multi-tenancy</span>
        </div>

        {isSigningIn ? (
          <div className="loading-block">
            <span className="spinner" />
            <span>Đang xác thực thông tin...</span>
          </div>
        ) : (
          <div className="login-action-box">
            {env.googleClientId && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={(response) => void handleSuccess(response.credential)}
                  onError={() => toast.error('Đăng nhập Google bị hủy hoặc thất bại.')}
                  text="signin_with"
                  shape="rectangular"
                  locale="vi"
                />
              </div>
            )}

            <button
              type="button"
              className="btn-dev-login"
              onClick={() => handleSuccess('mock|sinhvien@test.edu.vn')}
            >
              🚀 Vào ngay (Chế độ Thử nghiệm)
            </button>
          </div>
        )}

        <div className="login-footnote">
          <span>🔒 Bảo mật phiên bằng Stateless JWT · Chuẩn Clean OOP Architecture</span>
        </div>
      </div>
    </div>
  );
}
