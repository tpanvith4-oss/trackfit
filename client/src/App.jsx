import { useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { ScaleIcon, UtensilsIcon } from './components/icons.jsx';
import { TabBar } from './components/TabBar.jsx';
import { LogFoodPanel } from './features/food/LogFoodPanel.jsx';
import { LogWeightPanel } from './features/weight/LogWeightPanel.jsx';
import { useApiHealth } from './hooks/useApiHealth.js';

const TABS = [
  { id: 'food', label: 'Log Food', Icon: UtensilsIcon, Panel: LogFoodPanel },
  { id: 'weight', label: 'Log Weight', Icon: ScaleIcon, Panel: LogWeightPanel },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const apiStatus = useApiHealth();
  const { Panel } = TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader apiStatus={apiStatus} />

      <main
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]"
      >
        <Panel key={activeTab} />
      </main>

      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
