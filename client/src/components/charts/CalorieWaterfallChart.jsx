import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartEmpty } from './ChartEmpty.jsx';
import { AXIS_TICK, formatInt, GRID_STROKE, toNumber, TOOLTIP_CLASS } from './chartTheme.js';

const COLORS = { bmr: '#64748b', active: '#38bdf8', food: '#f59e0b', deficit: '#10b981', surplus: '#f43f5e' };

function LedgerTooltip({ active, payload }) {
  const step = active ? payload?.[0]?.payload : null;
  if (!step) return null;
  return (
    <div className={TOOLTIP_CLASS}>
      <p className="font-semibold text-slate-100">{step.name}</p>
      <p className="tabular-nums">{step.display}</p>
    </div>
  );
}

/** BMR + active burn − food = net. Floating bars show each step; net is green for a deficit, red for a surplus. */
export function CalorieWaterfallChart({ bmr, activeBurn, foodCalories }) {
  const base = Math.max(0, toNumber(bmr));
  const active = Math.max(0, toNumber(activeBurn));
  const food = Math.max(0, toNumber(foodCalories));
  const burned = base + active;
  const net = burned - food;
  const isDeficit = net >= 0;

  if (burned === 0 && food === 0) return <ChartEmpty>No calorie data for this day.</ChartEmpty>;

  const steps = [
    { name: 'BMR', range: [0, base], color: COLORS.bmr, display: `+${formatInt(base)} kcal` },
    { name: 'Active', range: [base, burned], color: COLORS.active, display: `+${formatInt(active)} kcal` },
    { name: 'Food', range: [burned - food, burned], color: COLORS.food, display: `−${formatInt(food)} kcal` },
    {
      name: isDeficit ? 'Deficit' : 'Surplus',
      range: [Math.min(0, net), Math.max(0, net)],
      color: isDeficit ? COLORS.deficit : COLORS.surplus,
      display: `${formatInt(Math.abs(net))} kcal ${isDeficit ? 'deficit' : 'surplus'}`,
    },
  ];

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} margin={{ top: 20, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<LedgerTooltip />} cursor={{ fill: 'var(--color-slate-800)', opacity: 0.4 }} />
          <ReferenceLine y={0} stroke="var(--color-slate-700)" />
          <Bar dataKey="range" radius={6} maxBarSize={44}>
            {steps.map((step) => (
              <Cell key={step.name} fill={step.color} />
            ))}
            <LabelList dataKey="display" position="top" fill="var(--color-slate-400)" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
