import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { VACUUM_TARGET_SETS, WATER_TARGET_ML } from '../../constants/cutProtocol.js';

function HabitPill({ active, label, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
        active
          ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
          : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
      }`}
    >
      {label}
    </button>
  );
}

export function DailyHabitPills({ checkin, disabled, onPatch }) {
  const [vacuumTimer, setVacuumTimer] = useState(null);

  useEffect(() => {
    if (vacuumTimer == null) return undefined;
    if (vacuumTimer <= 0) {
      setVacuumTimer(null);
      onPatch({ vacuumSetsCompleted: Math.min(VACUUM_TARGET_SETS, (checkin.vacuumSetsCompleted ?? 0) + 1) });
      return undefined;
    }
    const id = setTimeout(() => setVacuumTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [vacuumTimer, checkin.vacuumSetsCompleted, onPatch]);

  const waterMl = checkin.waterMl ?? 0;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Daily micro-habits</p>
      <div className="flex flex-wrap gap-2">
        <HabitPill
          disabled={disabled}
          active={waterMl >= WATER_TARGET_ML}
          label={`+500ml Water (${waterMl}/${WATER_TARGET_ML})`}
          onClick={() => onPatch({ waterMl: Math.min(10000, waterMl + 500) })}
        />
        <HabitPill
          disabled={disabled}
          active={Boolean(checkin.creatineTaken)}
          label="3g Creatine"
          onClick={() => onPatch({ creatineTaken: !checkin.creatineTaken })}
        />
        <HabitPill
          disabled={disabled}
          active={Boolean(checkin.soyaTripleRinsed)}
          label="Soya 3× rinsed"
          onClick={() => onPatch({ soyaTripleRinsed: !checkin.soyaTripleRinsed })}
        />
        <HabitPill
          disabled={disabled || vacuumTimer != null}
          active={(checkin.vacuumSetsCompleted ?? 0) >= VACUUM_TARGET_SETS}
          label={
            vacuumTimer != null
              ? `Vacuum ${vacuumTimer}s…`
              : `Vacuums ${checkin.vacuumSetsCompleted ?? 0}/${VACUUM_TARGET_SETS}`
          }
          onClick={() => setVacuumTimer(20)}
        />
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className={`rounded-full border px-3 py-1.5 text-xs ${
            checkin.isFoodLogComplete ? 'border-brand-500/40 bg-brand-500/15 text-brand-300' : 'border-slate-700'
          }`}
          onClick={() => onPatch({ isFoodLogComplete: !checkin.isFoodLogComplete })}
        >
          {checkin.isFoodLogComplete ? 'Log closed ✓' : 'Close daily log'}
        </Button>
      </div>
    </div>
  );
}
