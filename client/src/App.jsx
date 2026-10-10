import { useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { ActivityIcon, MoonIcon, ScaleIcon, UtensilsIcon } from './components/icons.jsx';
import { TabBar } from './components/TabBar.jsx';
import { WelcomeToast } from './components/WelcomeToast.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ActivityPanel } from './features/activity/ActivityPanel.jsx';
import { AuthModal } from './features/auth/AuthModal.jsx';
import { LogFoodPanel } from './features/food/LogFoodPanel.jsx';
import { SleepProvider } from './features/sleep/SleepContext.jsx';
import { SleepPanel } from './features/sleep/SleepPanel.jsx';
import { LogWeightPanel } from './features/weight/LogWeightPanel.jsx';
import { useApiHealth } from './hooks/useApiHealth.js';

const TABS = [
  { id: 'food', label: 'Log Food', Icon: UtensilsIcon, Panel: LogFoodPanel },
  { id: 'weight', label: 'Log Weight', Icon: ScaleIcon, Panel: LogWeightPanel },
  { id: 'activity', label: 'Activity', Icon: ActivityIcon, Panel: ActivityPanel },
  { id: 'sleep', label: 'Sleep', Icon: MoonIcon, Panel: SleepPanel },
];

function Dashboard() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const { Panel } = TABS.find((tab) => tab.id === activeTab);

  return (
    <SleepProvider>
      <main
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] motion-safe:animate-fade-in"
      >
        <Panel key={activeTab} />
      </main>

      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
    </SleepProvider>
  );
}

export default function App() {
  const { user, isAuthenticated, authEvent, logout } = useAuth();
  const apiStatus = useApiHealth();

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader apiStatus={apiStatus} user={user} onLogout={logout} />
      {isAuthenticated ? <Dashboard key={user.id} /> : <AuthModal />}
      <WelcomeToast event={authEvent} />
    </div>
  );
}
