import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotesPage } from './pages/NotesPage';
import { NoteViewPage } from './pages/NoteViewPage';
import { NoteEditPage } from './pages/NoteEditPage';
import { ShareNotePage } from './pages/ShareNotePage';
import { TasksPage } from './pages/TasksPage';
import { EditTaskPage } from './pages/EditTaskPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { Setup2FAPage } from './pages/Setup2FAPage';
import { Disable2FAPage } from './pages/Disable2FAPage';
import { InvitePage } from './pages/InvitePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ErrorPage } from './pages/ErrorPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
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
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/change-password" element={<ChangePasswordPage />} />
        <Route path="/profile/2fa/setup" element={<Setup2FAPage />} />
        <Route path="/profile/2fa/disable" element={<Disable2FAPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
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
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
