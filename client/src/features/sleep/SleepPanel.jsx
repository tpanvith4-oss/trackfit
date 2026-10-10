import { useState } from 'react';
import { ShuffleIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNow } from '../../hooks/useNow.js';
import { dayKey, formatDay } from '../../utils/date.js';
import { AlarmSettingsCard } from './AlarmSettingsCard.jsx';
import { BrownNoisePlayer } from './BrownNoisePlayer.jsx';
import { CognitiveShuffleModal } from './CognitiveShuffleModal.jsx';
import { useSleep } from './SleepContext.jsx';
import { SleepScheduleCard } from './SleepScheduleCard.jsx';
import { WakeChecklist } from './WakeChecklist.jsx';
import { WindDownTimeline } from './WindDownTimeline.jsx';

export function SleepPanel() {
  const { user } = useAuth();
  const { schedule, loading, loadError, reload, saveState, retrySave, updateSchedule, snoozeUntil, cancelSnooze, testAlarm } =
    useSleep();
  const [shuffleOpen, setShuffleOpen] = useState(false);
  const today = useNow(60_000);

  if (!schedule) {
    return (
      <Card title="Sleep schedule">
        {loading ? <ListSkeleton rows={4} /> : <ErrorMessage error={loadError} onRetry={reload} />}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SleepScheduleCard schedule={schedule} onChange={updateSchedule} saveState={saveState} onRetrySave={retrySave} />

      <WindDownTimeline schedule={schedule} />

      <Card title="Fall asleep faster" subtitle="Quiet a busy mind in the 15 minutes after lights out">
        <div className="space-y-3">
          <BrownNoisePlayer />
          <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-800 text-indigo-300">
              <ShuffleIcon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100">Cognitive shuffle</p>
              <p className="mt-0.5 text-xs text-slate-400">A calm, random word every 6 seconds to stop overthinking.</p>
            </div>
            <Button variant="ghost" className="shrink-0 border border-slate-700" onClick={() => setShuffleOpen(true)}>
              Start
            </Button>
          </div>
        </div>
      </Card>

      <AlarmSettingsCard
        schedule={schedule}
        onChange={updateSchedule}
        snoozeUntil={snoozeUntil}
        onCancelSnooze={cancelSnooze}
        onTest={testAlarm}
      />

      <Card title="Morning checklist" subtitle={formatDay(today)}>
        <WakeChecklist key={dayKey(today)} userId={user.id} />
      </Card>

      {shuffleOpen && <CognitiveShuffleModal onClose={() => setShuffleOpen(false)} />}
    </div>
  );
}
