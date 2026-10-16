import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartEmpty } from './ChartEmpty.jsx';
import { AXIS_TICK, GRID_STROKE, toNumber, TOOLTIP_CLASS } from './chartTheme.js';

const LINE_COLOR = '#38bdf8';
const TARGET_COLOR = '#10b981';
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const parseDate = (value) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

function WeightTooltip({ active, payload }) {
  const point = active ? payload?.[0]?.payload : null;
  if (!point) return null;
  return (
    <div className={TOOLTIP_CLASS}>
      <p className="font-semibold text-slate-100">{point.weight} kg</p>
      <p>{point.label}</p>
    </div>
  );
}

/** Weigh-ins (oldest → newest) with an optional dashed target line. */
export function WeightTrendAreaChart({ data, targetWeight }) {
  const gradientId = `weight-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const target = toNumber(targetWeight) > 0 ? toNumber(targetWeight) : null;

  const points = (Array.isArray(data) ? data : [])
    .map((row) => ({ at: parseDate(row?.date), weight: toNumber(row?.weight) }))
    .filter((row) => row.at && row.weight > 0)
    .sort((a, b) => a.at - b.at)
    .map((row) => ({ ts: row.at.getTime(), label: shortDate.format(row.at), weight: Math.round(row.weight * 10) / 10 }));

  if (points.length === 0) return <ChartEmpty>No weigh-ins in the last 30 days.</ChartEmpty>;

  const values = points.map((point) => point.weight).concat(target ?? []);
  const domain = [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.4} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis domain={domain} tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<WeightTooltip />} cursor={{ stroke: 'var(--color-slate-700)' }} />
          {target && (
            <ReferenceLine
              y={target}
              stroke={TARGET_COLOR}
              strokeDasharray="4 4"
              label={{ value: `Goal ${target} kg`, position: 'insideBottomRight', fill: TARGET_COLOR, fontSize: 10 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="weight"
            stroke={LINE_COLOR}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={points.length <= 12 ? { r: 2.5, fill: LINE_COLOR, strokeWidth: 0 } : false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
