import { useEffect, useState } from 'react';
import { DateNavigator } from '../../components/common/DateNavigator.jsx';
import { ActivityIcon, Cube3DIcon, FlameIcon, MoonIcon, ScaleIcon, UtensilsIcon } from '../../components/icons.jsx';
import { TabBar } from '../../components/TabBar.jsx';
import { useSelectedDate } from '../../hooks/useSelectedDate.js';
import * as syncQueue from '../../services/syncQueue.js';
import { ActivityPanel } from '../activity/ActivityPanel.jsx';
import { Analytics3DPanel } from '../analytics3d/Analytics3DPanel.jsx';
import { LogFoodPanel } from '../food/LogFoodPanel.jsx';
import { SleepProvider } from '../sleep/SleepContext.jsx';
import { SleepPanel } from '../sleep/SleepPanel.jsx';
import { LogWeightPanel } from '../weight/LogWeightPanel.jsx';
import { WorkoutPanel } from '../workout/WorkoutPanel.jsx';

const TABS = [
  { id: 'food', label: 'Food', Icon: UtensilsIcon, Panel: LogFoodPanel, dated: true },
  { id: 'analytics3d', label: '3D Lab', Icon: Cube3DIcon, Panel: Analytics3DPanel, dated: false, fullBleed: true },
  { id: 'weight', label: 'Weight', Icon: ScaleIcon, Panel: LogWeightPanel, dated: true },
  { id: 'train', label: 'Train', Icon: FlameIcon, Panel: WorkoutPanel, dated: false },
  { id: 'activity', label: 'Move', Icon: ActivityIcon, Panel: ActivityPanel, dated: true },
  { id: 'sleep', label: 'Sleep', Icon: MoonIcon, Panel: SleepPanel, dated: false },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const { Panel, dated, fullBleed } = TABS.find((tab) => tab.id === activeTab);
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
        className={
          fullBleed
            ? 'w-full flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] motion-safe:animate-fade-in'
            : 'mx-auto w-full max-w-md flex-1 space-y-4 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] motion-safe:animate-fade-in'
        }
      >
        {dated && <DateNavigator selectedDate={selectedDate} onDateChange={setDate} />}
        <Panel key={activeTab} selectedDate={selectedDate} />
      </main>

      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
    </SleepProvider>
  );
}
