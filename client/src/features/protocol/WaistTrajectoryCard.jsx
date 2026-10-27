import { useEffect, useMemo, useState } from 'react';
import { measurementsApi } from '../../api/measurementsApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { BASELINE_WAIST_CM, getMesocycleWeek, TARGET_WAIST_CM } from '../../constants/cutProtocol.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { formatFixed } from '../../utils/number.js';
import { MeasurementModal } from './MeasurementModal.jsx';

const FRIDAY = 5;

function waistProgress(waistCm) {
  const span = BASELINE_WAIST_CM - TARGET_WAIST_CM;
  if (!(span > 0) || waistCm == null) return 0;
  return Math.min(1, Math.max(0, (BASELINE_WAIST_CM - waistCm) / span));
}

export function WaistTrajectoryCard() {
  const { data, error, loading, reload } = useAsyncData((signal) => measurementsApi.trajectory({ signal }), []);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const openIfFridayAlarm = () => {
      if (new Date().getDay() === FRIDAY) setModalOpen(true);
    };
    window.addEventListener('trackfit:alarm-solved', openIfFridayAlarm);
    return () => window.removeEventListener('trackfit:alarm-solved', openIfFridayAlarm);
  }, []);

  const latest = data?.latest;
  const milestone = data?.milestone;
  const week = data?.mesocycleWeek ?? getMesocycleWeek();
  const progress = useMemo(() => waistProgress(latest?.waistUmbilicalCm), [latest]);

  return (
    <>
      <Card
        title="Waist & body-fat trajectory"
        subtitle={`Week ${week}/10 · target ${TARGET_WAIST_CM} cm by Jan 1`}
        action={
          <Button variant="ghost" className="shrink-0 border border-slate-700 px-3 py-1.5 text-xs" onClick={() => setModalOpen(true)}>
            Log waist & weight
          </Button>
        }
      >
        <ErrorMessage error={error} onRetry={reload} />
        {loading && !data ? (
          <div className="h-28 animate-pulse rounded-xl bg-slate-800/40" aria-busy="true" />
        ) : latest ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-800/50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Waist</p>
                <p className="text-lg font-bold tabular-nums text-slate-50">{formatFixed(latest.waistUmbilicalCm)} cm</p>
              </div>
              <div className="rounded-xl bg-slate-800/50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">WHtR</p>
                <p className="text-lg font-bold tabular-nums text-slate-50">{formatFixed(latest.whtr, 3)}</p>
              </div>
              <div className="rounded-xl bg-slate-800/50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">US Navy BF%</p>
                <p className="text-lg font-bold tabular-nums text-amber-300">{formatFixed(latest.estimatedBfPct)}%</p>
              </div>
              <div className="rounded-xl bg-slate-800/50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Lean mass</p>
                <p className="text-lg font-bold tabular-nums text-slate-50">{formatFixed(latest.leanMassKg)} kg</p>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                <span>{BASELINE_WAIST_CM} cm</span>
                <span>
                  Week {week} target {milestone?.waistCm ?? '—'} cm
                </span>
                <span>{TARGET_WAIST_CM} cm</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Scale {formatFixed(latest.weightKg)} kg · fat {formatFixed(latest.fatMassKg)} kg
                {data?.trajectory && (
                  <>
                    {' '}
                    · vs week target {data.trajectory.deltas.waistCm > 0 ? '+' : ''}
                    {formatFixed(data.trajectory.deltas.waistCm, 1)} cm / {data.trajectory.deltas.weightKg > 0 ? '+' : ''}
                    {formatFixed(data.trajectory.deltas.weightKg)} kg
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No waist check-in yet. Log a fasted measurement to start the curve.</p>
        )}
      </Card>

      {modalOpen && (
        <MeasurementModal
          defaults={latest}
          onClose={() => setModalOpen(false)}
          onSaved={() => reload()}
        />
      )}
    </>
  );
}
