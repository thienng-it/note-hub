import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ChatPage } from './pages/ChatPage';
import { Disable2FAPage } from './pages/Disable2FAPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { EditTaskPage } from './pages/EditTaskPage';
import { ErrorPage } from './pages/ErrorPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { GitHubCallbackPage } from './pages/GitHubCallbackPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { InvitePage } from './pages/InvitePage';
import { LoginPage } from './pages/LoginPage';
import { NoteEditPage } from './pages/NoteEditPage';
import { NotesPage } from './pages/NotesPage';
import { NoteViewPage } from './pages/NoteViewPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Setup2FAPage } from './pages/Setup2FAPage';
import { ShareNotePage } from './pages/ShareNotePage';
import { TasksPage } from './pages/TasksPage';

function AppRoutes() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="/auth/github/callback" element={<GitHubCallbackPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<NotesPage />} />
        <Route path="/notes/new" element={<NoteEditPage />} />
        <Route path="/notes/:id" element={<NoteViewPage />} />
        <Route path="/notes/:id/edit" element={<NoteEditPage />} />
        <Route path="/notes/:id/share" element={<ShareNotePage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/new" element={<EditTaskPage />} />
        <Route path="/tasks/:id/edit" element={<EditTaskPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/change-password" element={<ChangePasswordPage />} />
        <Route path="/profile/2fa/setup" element={<Setup2FAPage />} />
        <Route path="/profile/2fa/disable" element={<Disable2FAPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
      </Route>
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
            <AppRoutes />
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
