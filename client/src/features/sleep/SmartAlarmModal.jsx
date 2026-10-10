import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlarmClockIcon, SunIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useNow } from '../../hooks/useNow.js';
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock.js';
import { getAudioContext, isAudioSupported, resumeAudio } from '../../services/audioEngine.js';
import { formatTime } from '../../utils/date.js';
import { AlarmChallenge } from './AlarmChallenge.jsx';
import { ALARM_STAGES, startAlarmSignal } from './alarmSignal.js';
import { WakeChecklist } from './WakeChecklist.jsx';

const SOUND_CHECK_DELAY_MS = 800;

const firstNameOf = (name) => name?.trim().split(/\s+/)[0] ?? '';

function IntensityMeter({ stage }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-label={`Alarm intensity: ${ALARM_STAGES[stage].label}`}>
      <div className="flex items-end gap-1" aria-hidden>
        {ALARM_STAGES.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-full transition-colors duration-500 ${i <= stage ? 'bg-amber-400' : 'bg-slate-700'}`}
            style={{ height: `${8 + i * 5}px` }}
          />
        ))}
      </div>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{ALARM_STAGES[stage].label}</span>
    </div>
  );
}

/**
 * Full-screen wake-up alarm. Sound and haptics escalate until a cognitive challenge is
 * solved; only then can it be snoozed or dismissed. Dismissing opens the wake checklist.
 */
export function SmartAlarmModal({ challengeType, isTest, user, onSnooze, onDismiss, onClose }) {
  const id = useId();
  const [phase, setPhase] = useState('ringing');
  const [stage, setStage] = useState(0);
  const [solved, setSolved] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const dismissRef = useRef(null);
  const now = useNow(1_000);
  const firstName = firstNameOf(user.name);
  const isRinging = phase === 'ringing';

  useScreenWakeLock(true);

  useEffect(() => {
    if (!isRinging) return undefined;
    const stop = startAlarmSignal({ onStageChange: setStage });
    const soundCheck = setTimeout(() => {
      setSoundBlocked(isAudioSupported() && getAudioContext()?.state !== 'running');
    }, SOUND_CHECK_DELAY_MS);
    return () => {
      clearTimeout(soundCheck);
      stop();
    };
  }, [isRinging]);

  useEffect(() => {
    if (solved) dismissRef.current?.focus();
  }, [solved]);

  const handleSolved = useCallback(() => setSolved(true), []);

  const unblockSound = () => {
    if (soundBlocked) resumeAudio().then((running) => running && setSoundBlocked(false));
  };

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      onPointerDown={unblockSound}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 bg-linear-to-b from-slate-950 via-slate-950 to-amber-950 px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-safe:animate-fade-in"
    >
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col">
        {isRinging ? (
          <>
            <header className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                <AlarmClockIcon className="size-7 motion-safe:animate-pulse" />
              </div>
              <p className="text-6xl font-bold tracking-tight text-slate-50 tabular-nums">{formatTime(now)}</p>
              <h2 id={`${id}-title`} className="mt-2 text-lg font-semibold text-slate-200">
                {isTest ? 'Test alarm' : `Good morning${firstName ? `, ${firstName}` : ''}`}
              </h2>
              <div className="mt-3">
                <IntensityMeter stage={stage} />
              </div>
            </header>

            {soundBlocked && (
              <button
                type="button"
                onClick={unblockSound}
                className="mt-5 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"
              >
                Tap to turn on alarm sound
              </button>
            )}

            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/40 backdrop-blur">
              <AlarmChallenge type={challengeType} solved={solved} onSolved={handleSolved} />
            </section>

            <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
              <Button variant="ghost" className="border border-slate-700 py-3" disabled={!solved} onClick={onSnooze}>
                Snooze 9 min
              </Button>
              <Button
                ref={dismissRef}
                className="py-3"
                disabled={!solved}
                onClick={() => {
                  onDismiss();
                  setPhase('checklist');
                }}
              >
                Dismiss
              </Button>
            </div>
            {!solved && <p className="mt-3 text-center text-xs text-slate-500">Solve the challenge to unlock snooze and dismiss.</p>}
          </>
        ) : (
          <div className="my-auto motion-safe:animate-pop-in">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                <SunIcon className="size-7" />
              </div>
              <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-slate-50">
                You’re up{firstName ? `, ${firstName}` : ''}!
              </h2>
              <p className="mt-1 text-sm text-slate-400">Two quick wins to lock in tonight’s sleep.</p>
            </div>
            <div className="mt-6">
              <WakeChecklist userId={user.id} />
            </div>
            <Button className="mt-6 w-full py-3" onClick={onClose}>
              Start my day
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
