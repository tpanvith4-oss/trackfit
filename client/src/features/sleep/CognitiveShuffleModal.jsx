import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, WavesIcon } from '../../components/icons.jsx';
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock.js';
import * as brownNoise from './brownNoiseEngine.js';
import { createWordBag } from './shuffleWords.js';

const WORD_INTERVAL_MS = 6_000;
const SESSION_MS = 20 * 60_000;
const HINT_VISIBLE_MS = 20_000;

/**
 * Beaudoin's cognitive shuffle: a slow stream of unrelated, neutral images gives the
 * mind something to do that can't turn into planning or worrying, easing sleep onset.
 */
export function CognitiveShuffleModal({ onClose }) {
  const id = useId();
  const nextWordRef = useRef(null);
  nextWordRef.current ??= createWordBag();
  const [word, setWord] = useState(() => nextWordRef.current());
  const [showHint, setShowHint] = useState(true);
  const closeButtonRef = useRef(null);
  const noise = useSyncExternalStore(brownNoise.subscribe, brownNoise.getSnapshot);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useScreenWakeLock(true);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const wordTimer = setInterval(() => setWord(nextWordRef.current()), WORD_INTERVAL_MS);
    const hintTimer = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS);
    const sessionTimer = setTimeout(() => onCloseRef.current(), SESSION_MS);
    const onKeyDown = (event) => event.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearInterval(wordTimer);
      clearTimeout(hintTimer);
      clearTimeout(sessionTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const noiseOn = noise.status === 'playing';

  // Portalled so animated (transformed) ancestors can't become the containing block for `fixed`.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="fixed inset-0 z-50 flex flex-col bg-black px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-safe:animate-fade-in"
    >
      <div className="flex items-center justify-between">
        <h2 id={`${id}-title`} className="text-xs font-medium uppercase tracking-[0.2em] text-slate-600">
          Cognitive shuffle
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="End cognitive shuffle"
          className="flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900 hover:text-slate-400"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <p
          key={word}
          aria-live="polite"
          className="text-center text-4xl font-light tracking-wide text-amber-200/70 motion-safe:animate-shuffle-word"
        >
          {word}
        </p>
      </div>

      <div className="space-y-4 text-center">
        <p
          className={`mx-auto max-w-xs text-sm leading-relaxed text-slate-600 transition-opacity duration-[2000ms] ${
            showHint ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Picture each word for a moment — an image, not a story. Let it drift away when the next one arrives.
        </p>
        <button
          type="button"
          onClick={() => (noiseOn ? brownNoise.stop() : brownNoise.start())}
          aria-pressed={noiseOn}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
            noiseOn ? 'bg-amber-400/10 text-amber-200/70' : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          <WavesIcon className="size-4" />
          {noiseOn ? 'Brown noise on' : 'Add brown noise'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
