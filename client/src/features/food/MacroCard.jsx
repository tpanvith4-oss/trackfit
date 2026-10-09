import { Card } from '../../components/ui/Card.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { formatDay } from '../../utils/date.js';
import { formatNumber } from '../../utils/number.js';
import { DAILY_TARGETS } from './constants.js';

function MacroStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-800/60 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums text-slate-100">
        {formatNumber(value)}
        <span className="ml-0.5 text-xs font-medium text-slate-400">g</span>
      </p>
    </div>
  );
}

export function MacroCard({ totals, targets = DAILY_TARGETS, isLoading = false }) {
  const remainingKcal = Math.round(targets.calories - totals.calories);
  const isOverBudget = remainingKcal < 0;
  const proteinRemaining = targets.proteinG - totals.proteinG;
  const proteinMet = proteinRemaining <= 0;

  return (
    <Card title="Today" subtitle={formatDay(new Date())}>
      <div aria-busy={isLoading} className={`space-y-4 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Calorie budget</p>
              <p className="mt-0.5 tabular-nums">
                <span className="text-3xl font-bold text-slate-100">{formatNumber(Math.round(totals.calories))}</span>
                <span className="text-sm text-slate-400"> / {formatNumber(targets.calories)} kcal</span>
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold tabular-nums ${isOverBudget ? 'text-rose-400' : 'text-brand-400'}`}>
                {formatNumber(Math.abs(remainingKcal))}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{isOverBudget ? 'kcal over' : 'kcal left'}</p>
            </div>
          </div>
          <ProgressBar
            className="mt-2"
            label="Calories consumed against daily budget"
            value={totals.calories}
            max={targets.calories}
            tone={isOverBudget ? 'rose' : 'brand'}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Protein target</p>
            <p className="tabular-nums">
              <span className="text-base font-bold text-slate-100">{formatNumber(totals.proteinG)}</span>
              <span className="text-sm text-slate-400"> / {formatNumber(targets.proteinG)} g</span>
            </p>
          </div>
          <ProgressBar
            className="mt-2"
            label="Protein consumed against daily target"
            value={totals.proteinG}
            max={targets.proteinG}
            tone="sky"
          />
          <p className="mt-1 text-xs text-slate-500">
            {proteinMet ? 'Target hit — nice work.' : `${formatNumber(proteinRemaining)} g to go`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MacroStat label="Carbs" value={totals.carbsG} />
          <MacroStat label="Fat" value={totals.fatG} />
        </div>
      </div>
    </Card>
  );
}
