import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartEmpty } from './ChartEmpty.jsx';
import { AXIS_TICK, formatInt, GRID_STROKE, toNumber, TOOLTIP_CLASS } from './chartTheme.js';

const STEP_GOAL = 10_000;
const GOAL_COLOR = '#10b981';
const BELOW_GOAL_COLOR = '#64748b';

const compactSteps = (value) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value));

function StepsTooltip({ active, payload }) {
  const point = active ? payload?.[0]?.payload : null;
  if (!point) return null;
  return (
    <div className={TOOLTIP_CLASS}>
      <p className="font-semibold text-slate-100">{point.label ?? point.day}</p>
      <p className="tabular-nums">{formatInt(point.steps)} steps</p>
      <p className="tabular-nums">{formatInt(point.activeCalories)} active kcal</p>
    </div>
  );
}

/** Last 7 days of steps against the 10k goal. `data` is oldest → newest. */
export function WeeklyStepsBarChart({ data }) {
  const rows = (Array.isArray(data) ? data : []).map((row) => ({
    ...row,
    day: row?.day ?? '',
    steps: Math.max(0, toNumber(row?.steps)),
    activeCalories: Math.max(0, toNumber(row?.activeCalories)),
  }));

  if (rows.length === 0 || rows.every((row) => row.steps === 0)) {
    return <ChartEmpty>No steps recorded this week yet.</ChartEmpty>;
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
            tickFormatter={compactSteps}
            domain={[0, (max) => Math.ceil((Math.max(max, STEP_GOAL) * 1.1) / 1000) * 1000]}
          />
          <Tooltip content={<StepsTooltip />} cursor={{ fill: 'var(--color-slate-800)', opacity: 0.4 }} />
          <ReferenceLine
            y={STEP_GOAL}
            stroke={GOAL_COLOR}
            strokeDasharray="4 4"
            label={{ value: '10k Goal', position: 'insideTopRight', fill: GOAL_COLOR, fontSize: 10 }}
          />
          <Bar dataKey="steps" radius={[6, 6, 0, 0]} maxBarSize={32}>
            {rows.map((row, index) => (
              <Cell key={`${row.day}-${index}`} fill={row.steps >= STEP_GOAL ? GOAL_COLOR : BELOW_GOAL_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
