import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { formatInt, toNumber } from './chartTheme.js';

const MACROS = [
  { key: 'protein', label: 'Protein', color: '#6366f1', kcalPerGram: 4 },
  { key: 'carbs', label: 'Carbs', color: '#f59e0b', kcalPerGram: 4 },
  { key: 'fat', label: 'Fat', color: '#f43f5e', kcalPerGram: 9 },
];

const EMPTY_SLICE = [{ key: 'empty', value: 1, color: 'var(--color-slate-800)' }];
const oneDecimal = (value) => Math.round(value * 10) / 10;

/** Daily macro split by calories (4/4/9 kcal per gram), with the day's total in the middle. */
export function MacroDonutChart({ protein, carbs, fat, totalCalories }) {
  const grams = { protein: Math.max(0, toNumber(protein)), carbs: Math.max(0, toNumber(carbs)), fat: Math.max(0, toNumber(fat)) };
  const slices = MACROS.map((macro) => ({ ...macro, grams: grams[macro.key], value: grams[macro.key] * macro.kcalPerGram }));
  const macroKcal = slices.reduce((sum, slice) => sum + slice.value, 0);
  const isEmpty = macroKcal === 0;
  const data = isEmpty ? EMPTY_SLICE : slices.filter((slice) => slice.value > 0);

  return (
    <div>
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              outerRadius={80}
              startAngle={90}
              endAngle={-270}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={!isEmpty}
            >
              {data.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-slate-100">{formatInt(totalCalories)}</span>
          <span className="text-xs text-slate-400">kcal</span>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2" aria-label="Macro breakdown">
        {slices.map((slice) => (
          <li key={slice.key} className="rounded-xl bg-slate-800/50 px-2.5 py-2">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              {slice.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-100">
              {oneDecimal(slice.grams)} g
              <span className="ml-1 text-xs font-normal text-slate-500">
                {isEmpty ? 0 : Math.round((slice.value / macroKcal) * 100)}%
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
