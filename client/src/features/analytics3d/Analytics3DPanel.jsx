import { useEffect, useState } from 'react';
import {
  ChevronDownIcon,
  Cube3DIcon,
  MaximizeIcon,
  MinimizeIcon,
  RefreshIcon,
} from '../../components/icons.jsx';
import { ThreeAnalyticsCanvas } from './ThreeAnalyticsCanvas.jsx';
import { useAnalyticsData } from './useAnalyticsData.js';

const SCENES = [
  { id: 'skyline', label: '14d Skyline', subtitle: 'Stacked daily macros + active burn halos + calorie budget rail' },
  { id: 'macroCore', label: 'Macro Core', subtitle: '3D metabolic gyroscope rings + 4 protocol habit satellites' },
  { id: 'trajectory', label: 'Cut Trajectory', subtitle: '10-week protocol curve vs actual weight & waist milestones' },
];

const CAMERA_VIEWS = [
  { id: 'iso', label: 'Iso' },
  { id: 'top', label: 'Top' },
  { id: 'low', label: 'Low' },
];

const TONE_CLASS = {
  emerald: 'text-emerald-300',
  sky: 'text-sky-300',
  amber: 'text-amber-300',
  rose: 'text-rose-300',
  slate: 'text-slate-100',
};

export function Analytics3DPanel() {
  const { dataset, effectiveMode, hasLiveData, loading, setDataMode, reload } = useAnalyticsData();
  const [sceneMode, setSceneMode] = useState('skyline');
  const [cameraPreset, setCameraPreset] = useState('iso');
  const [presetTrigger, setPresetTrigger] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const activeSceneMeta = SCENES.find((s) => s.id === sceneMode) ?? SCENES[0];
  const inspected = hoveredItem ?? selectedItem;

  // Keyboard shortcut: 'H' toggles HUD controls, 'Escape' exits fullscreen
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setControlsOpen((open) => !open);
      } else if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen]);

  const handleCameraPreset = (presetId) => {
    setCameraPreset(presetId);
    setPresetTrigger((n) => n + 1);
  };

  const kpis = dataset.kpis;
  const latest = dataset.latestMeasurement;

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-40 flex flex-col bg-[#0b1220]'
          : 'relative flex h-[calc(100vh-8.25rem)] min-h-[520px] w-full flex-col overflow-hidden bg-[#0b1220]'
      }
    >
      {/* Full-bleed WebGL Viewport */}
      <div className="relative flex-1 overflow-hidden">
        <ThreeAnalyticsCanvas
          sceneMode={sceneMode}
          dataset={dataset}
          cameraPreset={cameraPreset}
          presetTrigger={presetTrigger}
          autoOrbit={autoOrbit}
          explodeFactor={explodeFactor}
          onSelectItem={setSelectedItem}
          onHoverItem={setHoveredItem}
        />

        {/* Minimal Top-Left Scene Title & Quick Status */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-[calc(100%-6.5rem)] flex-col gap-2">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-slate-700/90 bg-slate-950/92 px-3 py-1.5 shadow-lg">
            <Cube3DIcon className="size-4 shrink-0 text-sky-400" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xs font-semibold tracking-wide text-slate-100">
                  TrackFit 3D Lab · {activeSceneMeta.label}
                </h2>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                  {effectiveMode === 'live' ? 'My Data' : 'Sample 14d'}
                </span>
              </div>
              <p className="hidden truncate text-[11px] text-slate-400 sm:block">{activeSceneMeta.subtitle}</p>
            </div>
          </div>

          {/* Click / Hover Datum Readout */}
          {inspected && (
            <div className="pointer-events-auto max-w-xs rounded-xl border border-slate-700/90 bg-slate-950/92 px-3 py-2 shadow-lg">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-slate-100">{inspected.title}</p>
                <span className="text-[11px] tabular-nums text-slate-400">{inspected.subtitle}</span>
              </div>
              {Array.isArray(inspected.metrics) && inspected.metrics.length > 0 && (
                <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-1">
                  {inspected.metrics.map((m) => (
                    <div key={m.label} className="min-w-0">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400">{m.label}</span>
                      <span className={`block text-[11px] font-semibold tabular-nums ${TONE_CLASS[m.tone] ?? 'text-slate-100'}`}>
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Compact Viewport Actions */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            aria-label="Refresh analytics data"
            title="Refresh TrackFit data"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/90 bg-slate-950/92 text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:opacity-50"
          >
            <RefreshIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen 3D Studio'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/90 bg-slate-950/92 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            {fullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
          </button>
        </div>

        {/* Optional Cross-Metric Insights Strip (only shown when toggled) */}
        {insightsOpen && (
          <div className="absolute inset-x-3 bottom-20 z-10 mx-auto max-w-4xl rounded-xl border border-slate-700/90 bg-slate-950/95 p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                Cross-Metric Telemetry · 7-Day Rolling & Cut Protocol
              </p>
              <button
                type="button"
                onClick={() => setInsightsOpen(false)}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">7d Avg Intake</p>
                <p className="text-sm font-bold tabular-nums text-slate-100">{kpis.avgCalories7d} kcal</p>
                <p className="text-[10px] tabular-nums text-slate-400">Target {dataset.targets.calories}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Protein Adherence</p>
                <p className="text-sm font-bold tabular-nums text-emerald-300">{kpis.proteinAdherencePct}%</p>
                <p className="text-[10px] tabular-nums text-slate-400">{kpis.avgProtein7d}g / {dataset.targets.proteinG}g</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Active Burn</p>
                <p className="text-sm font-bold tabular-nums text-rose-300">{kpis.avgActiveBurn7d} kcal</p>
                <p className="text-[10px] tabular-nums text-slate-400">Net {kpis.avgNetBalance7d} kcal</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Habit Adherence</p>
                <p className="text-sm font-bold tabular-nums text-sky-300">{kpis.avgHabitScore}%</p>
                <p className="text-[10px] text-slate-400">Water · Cr · Vacuums</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Waist & BF%</p>
                <p className="text-sm font-bold tabular-nums text-amber-300">
                  {latest?.waistUmbilicalCm ? `${latest.waistUmbilicalCm} cm` : '—'}
                </p>
                <p className="text-[10px] tabular-nums text-slate-400">
                  {latest?.estimatedBfPct ? `${latest.estimatedBfPct}% Navy BF` : `Week ${dataset.currentWeek}/10`}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Muscle Readiness</p>
                <p className="text-sm font-bold tabular-nums text-emerald-300">{kpis.recoveryPct}%</p>
                <p className="text-[10px] text-slate-400">{kpis.loggedDaysCount}/14d logged</p>
              </div>
            </div>
          </div>
        )}

        {/* Unified Collapsible Bottom Control Dock */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-col items-center">
          <div className="pointer-events-auto w-full max-w-4xl">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setControlsOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/90 bg-slate-950/92 px-3 py-1 text-[11px] font-medium text-slate-300 transition hover:text-slate-100"
              >
                <ChevronDownIcon className={`size-3.5 transition-transform ${controlsOpen ? '' : 'rotate-180'}`} />
                {controlsOpen ? 'Hide Controls' : 'Show Controls'}
              </button>
            </div>

            {controlsOpen && (
              <div className="rounded-xl border border-slate-700/90 bg-slate-950/94 px-3 py-2.5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Scene Mode Switcher */}
                  <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-0.5">
                    {SCENES.map((s) => {
                      const active = sceneMode === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSceneMode(s.id)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                            active
                              ? 'bg-sky-500 text-slate-950'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Camera Presets + Auto Orbit */}
                  <div className="flex items-center gap-1">
                    {CAMERA_VIEWS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleCameraPreset(v.id)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                          cameraPreset === v.id
                            ? 'border-sky-500/70 bg-sky-500/15 text-sky-300'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAutoOrbit((o) => !o)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                        autoOrbit
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      Orbit
                    </button>
                  </div>

                  {/* Exploded Layer Slider */}
                  <label className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                    <span>Explode</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={explodeFactor}
                      onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                      className="h-1.5 w-20 accent-sky-400"
                    />
                  </label>

                  {/* Data Source Toggle + Insights Sheet Button */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDataMode(effectiveMode === 'live' ? 'sample' : 'live')}
                      title={
                        hasLiveData
                          ? 'Toggle between your logged TrackFit data and a 14-day sample preview'
                          : 'Log meals or toggle to preview populated 14-day sample data'
                      }
                      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:border-slate-500"
                    >
                      {effectiveMode === 'live' ? 'View Sample' : 'Use My Data'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsightsOpen((o) => !o)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                        insightsOpen
                          ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      KPIs
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
