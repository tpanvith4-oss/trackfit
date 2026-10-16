import { AppHeader } from './components/AppHeader.jsx';
import { WelcomeToast } from './components/WelcomeToast.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { AuthModal } from './features/auth/AuthModal.jsx';
import { Dashboard } from './features/dashboard/Dashboard.jsx';
import { useApiHealth } from './hooks/useApiHealth.js';

export default function App() {
  const { user, isAuthenticated, isReady, authEvent, logout } = useAuth();
  const apiStatus = useApiHealth();

  // Blank until the stored session is read, so a signed-in user never sees the login screen flash.
  if (!isReady) return <div className="min-h-full" aria-busy="true" />;

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader apiStatus={apiStatus} user={user} onLogout={logout} />
      {isAuthenticated ? <Dashboard key={user.id} /> : <AuthModal />}
      <WelcomeToast event={authEvent} />
    </div>
  );
}
