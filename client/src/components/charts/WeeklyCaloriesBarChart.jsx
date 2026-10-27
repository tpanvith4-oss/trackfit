import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartEmpty } from './ChartEmpty.jsx';
import { AXIS_TICK, formatInt, GRID_STROKE, toNumber, TOOLTIP_CLASS } from './chartTheme.js';

const HIGH_BURN_COLOR = '#f59e0b';
const LOW_BURN_COLOR = '#64748b';
const HIGH_BURN_THRESHOLD = 300;

const compactKcal = (value) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value));

function CaloriesTooltip({ active, payload }) {
  const point = active ? payload?.[0]?.payload : null;
  if (!point) return null;
  return (
    <div className={TOOLTIP_CLASS}>
      <p className="font-semibold text-slate-100">{point.label ?? point.day}</p>
      <p className="tabular-nums">{formatInt(point.activeCalories)} active kcal</p>
      <p className="tabular-nums text-slate-400">{formatInt(point.steps)} steps</p>
    </div>
  );
}

/** Last 7 days of active calories burned. `data` is oldest → newest. */
export function WeeklyCaloriesBarChart({ data }) {
  const rows = (Array.isArray(data) ? data : []).map((row) => ({
    ...row,
    day: row?.day ?? '',
    steps: Math.max(0, toNumber(row?.steps)),
    activeCalories: Math.max(0, toNumber(row?.activeCalories)),
  }));

  if (rows.length === 0 || rows.every((row) => row.activeCalories === 0)) {
    return <ChartEmpty>No active calories recorded this week yet.</ChartEmpty>;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tickFormatter={compactKcal}
            domain={[0, (max) => Math.ceil((Math.max(max, 100) * 1.15) / 50) * 50]}
          />
          <Tooltip content={<CaloriesTooltip />} cursor={{ fill: 'var(--color-slate-800)', opacity: 0.4 }} />
          <Bar dataKey="activeCalories" radius={[6, 6, 0, 0]} maxBarSize={32}>
            {rows.map((row, index) => (
              <Cell
                key={`${row.day}-${index}`}
                fill={row.activeCalories >= HIGH_BURN_THRESHOLD ? HIGH_BURN_COLOR : LOW_BURN_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
