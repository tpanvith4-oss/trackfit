import { useEffect, useState } from 'react';
import { DateNavigator } from '../../components/common/DateNavigator.jsx';
import { ActivityIcon, MoonIcon, ScaleIcon, UtensilsIcon } from '../../components/icons.jsx';
import { TabBar } from '../../components/TabBar.jsx';
import { useSelectedDate } from '../../hooks/useSelectedDate.js';
import * as syncQueue from '../../services/syncQueue.js';
import { ActivityPanel } from '../activity/ActivityPanel.jsx';
import { LogFoodPanel } from '../food/LogFoodPanel.jsx';
import { SleepProvider } from '../sleep/SleepContext.jsx';
import { SleepPanel } from '../sleep/SleepPanel.jsx';
import { LogWeightPanel } from '../weight/LogWeightPanel.jsx';

const TABS = [
  { id: 'food', label: 'Log Food', Icon: UtensilsIcon, Panel: LogFoodPanel, dated: true },
  { id: 'weight', label: 'Log Weight', Icon: ScaleIcon, Panel: LogWeightPanel, dated: true },
  { id: 'activity', label: 'Activity', Icon: ActivityIcon, Panel: ActivityPanel, dated: true },
  { id: 'sleep', label: 'Sleep', Icon: MoonIcon, Panel: SleepPanel, dated: false },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const { Panel, dated } = TABS.find((tab) => tab.id === activeTab);
  const { selectedDate, setDate } = useSelectedDate();

  // Replays offline changes now, when the network returns, and when the app is reopened
  // (Android resumes the WebView without an `online` event).
  useEffect(() => {
    const sync = () => syncQueue.processQueue({ restart: true });
    const syncWhenVisible = () => document.visibilityState === 'visible' && sync();
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', syncWhenVisible);
    syncQueue.processQueue();
    return () => {
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      syncQueue.cancelScheduledRetry();
    };
  }, []);

  return (
    <SleepProvider>
      <main
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] motion-safe:animate-fade-in"
      >
        {dated && <DateNavigator selectedDate={selectedDate} onDateChange={setDate} />}
        <Panel key={activeTab} selectedDate={selectedDate} />
      </main>

      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
    </SleepProvider>
  );
}
