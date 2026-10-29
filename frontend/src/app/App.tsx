import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { env } from '../config/env';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { AppRouter } from './AppRouter';

export default function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={env.googleClientId}>
        <AuthProvider>
          <Toaster position="top-right" />
          <AppRouter />
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
