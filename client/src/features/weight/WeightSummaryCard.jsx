import { Card } from '../../components/ui/Card.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { formatDay } from '../../utils/date.js';
import { formatFixed, formatSigned } from '../../utils/number.js';
import { CUT_PROTOCOL } from './constants.js';

const TONE_STYLES = {
  emerald: { container: 'border-emerald-500/30 bg-emerald-500/10', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  amber: { container: 'border-amber-500/30 bg-amber-500/10', dot: 'bg-amber-400', text: 'text-amber-300' },
  sky: { container: 'border-sky-500/30 bg-sky-500/10', dot: 'bg-sky-400', text: 'text-sky-300' },
  slate: { container: 'border-slate-600 bg-slate-800/70', dot: 'bg-slate-400', text: 'text-slate-200' },
  subtle: { container: 'border-dashed border-slate-700 bg-transparent', dot: 'bg-slate-600', text: 'text-slate-400' },
};

function RateStatusBadge({ status }) {
  const styles = TONE_STYLES[status.tone] ?? TONE_STYLES.subtle;
  return (
    <div role="status" className={`rounded-xl border px-3 py-2.5 ${styles.container}`}>
      <p className={`flex items-start gap-2 text-sm font-semibold ${styles.text}`}>
        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
        {status.label}
      </p>
      <p className="mt-0.5 pl-4 text-xs text-slate-400">{status.description}</p>
    </div>
  );
}

function StatTile({ label, value, unit, caption, valueClassName = 'text-slate-100' }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-800/60 px-2.5 py-2.5">
      <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate text-2xl font-bold tabular-nums ${valueClassName}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-slate-400">{unit}</span>}
      </p>
      {caption && <p className="truncate text-[11px] text-slate-500">{caption}</p>}
    </div>
  );
}

function describeTargetZone(weightKg, { targetMinKg, targetMaxKg }) {
  if (weightKg > targetMaxKg) return `${formatFixed(weightKg - targetMaxKg)} kg to target zone`;
  if (weightKg >= targetMinKg) return 'In target zone';
  return `${formatFixed(targetMinKg - weightKg)} kg below target zone`;
}

function ProtocolProgress({ weightKg, basis, protocol }) {
  const { baselineKg, targetMinKg, targetMaxKg } = protocol;
  const totalToLose = baselineKg - targetMaxKg;
  const lostSoFar = weightKg != null ? baselineKg - weightKg : 0;

  return (
    <div className="rounded-xl border border-slate-800 p-3">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <p className="text-slate-400">
          Baseline <span className="font-semibold tabular-nums text-slate-200">{formatFixed(baselineKg)} kg</span>
        </p>
        <p className="text-slate-400">
          Target zone{' '}
          <span className="font-semibold tabular-nums text-emerald-300">
            {formatFixed(targetMinKg)}–{formatFixed(targetMaxKg)} kg
          </span>
        </p>
      </div>
      <ProgressBar
        className="mt-2"
        label="Progress from baseline to target zone"
        value={Math.max(0, lostSoFar)}
        max={totalToLose}
      />
      {weightKg != null ? (
        <p className="mt-1.5 flex justify-between gap-3 text-xs text-slate-500">
          <span className="tabular-nums">{formatSigned(weightKg - baselineKg)} kg from baseline</span>
          <span className="text-right">
            {describeTargetZone(weightKg, protocol)} <span className="text-slate-600">({basis})</span>
          </span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">Log a weigh-in to track progress toward the target zone.</p>
      )}
    </div>
  );
}

export function WeightSummaryCard({ stats, status, protocol = CUT_PROTOCOL, isLoading = false }) {
  const { latest, currentAvg, currentDays, previousAvg, weeklyDelta } = stats;
  const deltaTone = TONE_STYLES[status.tone] ?? TONE_STYLES.subtle;
  const progressWeight = currentAvg ?? latest?.weightKg ?? null;

  return (
    <Card title="Cut progress" subtitle={latest ? `Last weigh-in ${formatDay(latest.loggedAt)}` : 'No weigh-ins yet'}>
      <div aria-busy={isLoading} className={`space-y-3 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
        <RateStatusBadge status={status} />

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Scale" value={latest ? formatFixed(latest.weightKg) : '—'} unit={latest && 'kg'} caption="Latest" />
          <StatTile
            label="7-day avg"
            value={currentAvg != null ? formatFixed(currentAvg, 2) : '—'}
            unit={currentAvg != null && 'kg'}
            caption={currentDays > 0 ? `${currentDays} of 7 days` : 'No logs this week'}
          />
          <StatTile
            label="7-day Δ"
            value={weeklyDelta != null ? formatSigned(weeklyDelta, 2) : '—'}
            unit={weeklyDelta != null && 'kg'}
            caption={previousAvg != null ? `vs ${formatFixed(previousAvg, 2)} prior` : 'Needs prior week'}
            valueClassName={weeklyDelta != null ? deltaTone.text : 'text-slate-500'}
          />
        </div>

        <ProtocolProgress
          weightKg={progressWeight}
          basis={currentAvg != null ? '7-day avg' : 'latest'}
          protocol={protocol}
        />
      </div>
    </Card>
  );
}
