import { useEffect, useState } from 'react';
import { CheckCircleIcon } from './icons.jsx';

const VISIBLE_MS = 3500;

function messageFor(event) {
  const firstName = event.name.trim().split(/\s+/)[0];
  return event.type === 'register' ? `Profile created — welcome, ${firstName}!` : `Welcome back, ${firstName}!`;
}

export function WelcomeToast({ event }) {
  const [visibleEvent, setVisibleEvent] = useState(null);

  useEffect(() => {
    if (!event) {
      setVisibleEvent(null);
      return undefined;
    }
    setVisibleEvent(event);
    const timeoutId = setTimeout(() => setVisibleEvent(null), VISIBLE_MS);
    return () => clearTimeout(timeoutId);
  }, [event]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-30 flex justify-center px-4"
    >
      {visibleEvent && (
        <div
          key={visibleEvent.at}
          role="status"
          className="flex items-center gap-2 rounded-full border border-brand-500/30 bg-slate-900/95 px-4 py-2 text-sm font-medium text-slate-100 shadow-lg shadow-black/40 backdrop-blur motion-safe:animate-toast-in"
        >
          <CheckCircleIcon className="size-4 text-brand-400" />
          {messageFor(visibleEvent)}
        </div>
      )}
    </div>
  );
}
