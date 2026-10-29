import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { RequireRole } from '../features/auth/RequireRole';
import { LoadingBlock } from '../shared/components/LoadingBlock';
import { AppLayout } from '../shared/layout/AppLayout';
import NotFoundPage from './NotFoundPage';

// Each screen is a separate bundle, loaded on first visit.
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const DocumentsPage = lazy(() => import('../features/documents/DocumentsPage'));
const ChatPage = lazy(() => import('../features/chat/ChatPage'));
const QuizPage = lazy(() => import('../features/quiz/QuizPage'));
const AdminPage = lazy(() => import('../features/admin/AdminPage'));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingBlock />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DocumentsPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="quiz" element={<QuizPage />} />
              <Route element={<RequireRole roles={['admin']} />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
