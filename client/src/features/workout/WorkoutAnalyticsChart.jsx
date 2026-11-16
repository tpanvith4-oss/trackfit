import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { workoutsApi } from '../../api/workoutsApi.js';
import { ChartEmpty } from '../../components/charts/ChartEmpty.jsx';
import { AXIS_TICK, GRID_STROKE, TOOLTIP_CLASS, toNumber } from '../../components/charts/chartTheme.js';

const LINE_COLOR = '#34d399';
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function VolumeTooltip({ active, payload }) {
  const point = active ? payload?.[0]?.payload : null;
  if (!point) return null;
  return (
    <div className={TOOLTIP_CLASS}>
      <p className="font-semibold text-slate-100">{point.volumeKg} kg volume</p>
      <p>
        {point.sets} sets · top {point.topWeightKg} kg × {point.topReps}
      </p>
      <p className="text-slate-500">{point.label}</p>
    </div>
  );
}

/** Volume (weight × reps) progression for one exercise over recent sessions. */
export function WorkoutAnalyticsChart({ exerciseName }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(Boolean(exerciseName));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!exerciseName) {
      setPoints([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    workoutsApi
      .history(exerciseName, { days: 60, signal: controller.signal })
      .then((data) => {
        const next = (data?.points ?? []).map((row) => {
          const at = new Date(`${row.date}T00:00:00`);
          return {
            ...row,
            ts: at.getTime(),
            label: shortDate.format(at),
            volumeKg: Math.round(toNumber(row.volumeKg) * 10) / 10,
          };
        });
        setPoints(next);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err);
        setPoints([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [exerciseName]);

  if (!exerciseName) return null;
  if (loading) return <div className="h-44 animate-pulse rounded-xl bg-slate-800/40" aria-busy="true" />;
  if (error) return <ChartEmpty>Couldn’t load volume history.</ChartEmpty>;
  if (points.length === 0) return <ChartEmpty>Log a few sets to see volume progression.</ChartEmpty>;

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
          <Tooltip content={<VolumeTooltip />} cursor={{ stroke: 'var(--color-slate-700)' }} />
          <Line
            type="monotone"
            dataKey="volumeKg"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={points.length <= 14 ? { r: 3, fill: LINE_COLOR, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
