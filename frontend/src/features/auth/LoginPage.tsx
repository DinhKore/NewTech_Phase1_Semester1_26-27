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
        <div className="login-logo">🎓</div>
        <h1>Course Assistant</h1>
        <p className="login-subtitle">
          Trợ lý học tập AI: hỏi đáp và ôn tập dựa trên chính tài liệu bài giảng của bạn.
        </p>

        {isSigningIn ? (
          <div className="loading-block">
            <span className="spinner" />
            <span>Đang xác thực...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            {env.googleClientId && (
              <div className="login-google-button">
                <GoogleLogin
                  onSuccess={(response) => void handleSuccess(response.credential)}
                  onError={() => toast.error('Đăng nhập Google bị hủy hoặc thất bại.')}
                  text="signin_with"
                  shape="rectangular"
                  locale="vi"
                />
              </div>
            )}

            {/* Dev quick login button if Google Client ID is not configured yet or for instant testing */}
            <div style={{ width: '100%', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.65rem 1rem' }}
                onClick={() => handleSuccess('mock|sinhvien@test.edu.vn')}
              >
                🚀 Đăng nhập nhanh (Chế độ Thử nghiệm)
              </button>
            </div>
          </div>
        )}

        <p className="login-footnote">Đăng nhập bằng OAuth 2.0 (Google). Phiên làm việc được bảo vệ bằng JWT.</p>
      </div>
    </div>
  );
}
