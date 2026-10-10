import { useId, useState, useSyncExternalStore } from 'react';
import { PauseIcon, PlayIcon, WavesIcon } from '../../components/icons.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { useNow } from '../../hooks/useNow.js';
import { isAudioSupported } from '../../services/audioEngine.js';
import { formatDuration } from '../../services/circadianService.js';
import * as brownNoise from './brownNoiseEngine.js';

export function BrownNoisePlayer() {
  const id = useId();
  const { status, volume, timerEnabled, endsAt } = useSyncExternalStore(brownNoise.subscribe, brownNoise.getSnapshot);
  const [unavailable, setUnavailable] = useState(!isAudioSupported());
  const now = useNow(15_000);
  const isPlaying = status === 'playing';

  const toggle = () => {
    if (isPlaying) brownNoise.stop();
    else if (!brownNoise.start()) setUnavailable(true);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={unavailable}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Stop brown noise' : 'Play brown noise'}
          className={`relative flex size-14 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
            isPlaying ? 'bg-amber-400/90 text-slate-950' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
          }`}
        >
          {isPlaying && <span aria-hidden className="absolute -inset-1.5 rounded-full ring-2 ring-amber-400/40 motion-safe:animate-pulse" />}
          {isPlaying ? <PauseIcon className="relative size-6" /> : <PlayIcon className="relative size-6 translate-x-0.5" />}
        </button>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
            <WavesIcon className="size-4 text-amber-300" /> Brown noise
          </p>
          <p className="mt-0.5 text-xs text-slate-400" aria-live="polite">
            {unavailable
              ? 'Audio synthesis isn’t supported on this device.'
              : isPlaying
                ? endsAt
                  ? `Fading out in ${formatDuration(endsAt - now.getTime())}`
                  : 'Playing until you stop it'
                : 'Synthesized on-device · no downloads'}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-volume`} className="mb-1.5 flex justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
          Volume <span className="tabular-nums text-slate-500">{Math.round(volume * 100)}%</span>
        </label>
        <input
          id={`${id}-volume`}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(event) => brownNoise.setVolume(Number(event.target.value))}
          className="w-full accent-amber-400"
        />
      </div>

      <Switch
        checked={timerEnabled}
        onChange={brownNoise.setTimerEnabled}
        label="45-minute sleep timer"
        description="Fades out gently over the last 10 minutes."
      />
    </div>
  );
}
