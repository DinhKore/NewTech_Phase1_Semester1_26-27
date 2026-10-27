// frontend/src/pages/LoginPage.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';

interface LoginPageProps {
    onLoginSuccess: (user: any, token: string) => void;
}

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
    const [loading, setLoading] = useState(false);

    const handleOAuthLogin = async (role: 'admin' | 'user') => {
        setLoading(true);

        const email = role === 'admin' ? 'admin@course.edu.vn' : 'student@course.edu.vn';
        const name = role === 'admin' ? 'Quản Trị Viên (Admin)' : 'Nguyễn Văn Sinh Viên';

        try {
            const res = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, role })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi đăng nhập');

            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));

            toast.success(`Đăng nhập thành công với quyền ${role.toUpperCase()}!`);
            onLoginSuccess(data.user, data.token);
        } catch (err: any) {
            toast.error(err.message || 'Không thể kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
            <div style={{ background: 'white', padding: '48px 40px', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.06)', width: '420px', textAlign: 'center', border: '1px solid #e2e8f0' }}>

                <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px auto' }}>
                    🎓
                </div>

                <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px' }}>Course Assistant AI</h2>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px', lineHeight: '1.5' }}>
                    Cổng đăng nhập hệ thống trợ lý học tập.<br />Xác thực tiêu chuẩn <b>OAuth2 Google SSO Mock & JWT</b>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* NÚT ĐĂNG NHẬP GOOGLE ADMIN */}
                    <button
                        onClick={() => handleOAuthLogin('admin')}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            padding: '12px 20px', background: '#0f172a', color: 'white', border: 'none',
                            borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {/* SVG Google Logo */}
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{loading ? 'Đang xác thực...' : 'Đăng nhập Google (Quyền Admin)'}</span>
                    </button>

                    {/* NÚT ĐĂNG NHẬP SINH VIÊN */}
                    <button
                        onClick={() => handleOAuthLogin('user')}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            padding: '12px 20px', background: '#0284c7', color: 'white', border: 'none',
                            borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>🎓</span>
                        <span>{loading ? 'Đang xác thực...' : 'Đăng nhập Cổng Sinh Viên (User)'}</span>
                    </button>
                </div>

                <div style={{ marginTop: '28px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    🔒 Bảo mật: <b>JWT Header Authenticated</b>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;