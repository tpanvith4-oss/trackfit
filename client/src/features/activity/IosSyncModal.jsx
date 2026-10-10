import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { activityApi, HEALTH_SYNC_URL } from '../../api/activityApi.js';
import { CheckIcon, CloseIcon, CopyIcon, SmartphoneIcon, SpinnerIcon } from '../../components/icons.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { copyText } from '../../utils/clipboard.js';

const COPIED_RESET_MS = 2_000;
const expiryFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

const EXAMPLE_BODY = `{
  "date": "2026-10-10",
  "steps": 8234,
  "activeCalories": 412,
  "distanceKm": 5.6
}`;

const maskToken = (token) => `${token.slice(0, 10)}…${token.slice(-6)}`;

function useCopyFeedback() {
  const [copiedKey, setCopiedKey] = useState(null);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback(async (key, text) => {
    const ok = await copyText(text);
    clearTimeout(timerRef.current);
    setCopiedKey(ok ? key : null);
    timerRef.current = setTimeout(() => setCopiedKey(null), COPIED_RESET_MS);
    return ok;
  }, []);

  return { copiedKey, copy };
}

function CopyButton({ copied, onClick, label }) {
  return (
    <IconButton label={copied ? 'Copied' : label} onClick={onClick} className="shrink-0">
      {copied ? <CheckIcon className="size-4 text-brand-400" /> : <CopyIcon className="size-4" />}
    </IconButton>
  );
}

function Code({ children }) {
  return <code className="rounded bg-slate-800 px-1 py-0.5 text-[0.8em] text-slate-200">{children}</code>;
}

const STEPS = [
  {
    title: 'Read today’s totals',
    body: (
      <>
        In <b>Shortcuts</b>, tap <b>+</b> and add <b>Find Health Samples</b> (Type: Steps, Start Date is Today), then{' '}
        <b>Calculate Statistics</b> → Sum. Repeat for <b>Active Energy</b> and <b>Walking + Running Distance</b> (unit: km).
      </>
    ),
  },
  {
    title: 'Add the date',
    body: (
      <>
        Add <b>Format Date</b> with Current Date and the custom format <Code>yyyy-MM-dd</Code>.
      </>
    ),
  },
  {
    title: 'Send it to TrackFit',
    body: (
      <>
        Add <b>Get Contents of URL</b> with your sync URL. Method <b>POST</b>, header <Code>Authorization</Code> ={' '}
        <Code>Bearer </Code> followed by your token. Request Body <b>JSON</b> with the fields below, using <b>Number</b> for
        the totals.
      </>
    ),
  },
  {
    title: 'Run it automatically',
    body: (
      <>
        Run it once to test, then go to <b>Automation</b> → <b>+</b> → <b>Time of Day</b> (e.g. 9:00 PM daily) →{' '}
        <b>Run Immediately</b>. Steps show up here after each run.
      </>
    ),
  },
];

/**
 * Explains the free iOS Health bridge: Apple's Shortcuts app reads Health totals and POSTs
 * them to the sync URL with a sync-only token, so no paid developer account is needed.
 */
export function IosSyncModal({ onClose }) {
  const id = useId();
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [tokenState, setTokenState] = useState({ status: 'loading', token: null, expiresAt: null, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const [revealToken, setRevealToken] = useState(false);
  const { copiedKey, copy } = useCopyFeedback();

  useEffect(() => {
    const opener = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => event.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  // Minted up front so "Copy" writes synchronously within the tap, which iOS Safari requires.
  useEffect(() => {
    let active = true;
    setTokenState((prev) => ({ ...prev, status: 'loading', error: null }));
    activityApi
      .createSyncToken()
      .then(({ token, expiresAt }) => active && setTokenState({ status: 'ready', token, expiresAt, error: null }))
      .catch((error) => active && setTokenState({ status: 'error', token: null, expiresAt: null, error }));
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const copyToken = async () => {
    const ok = await copy('token', tokenState.token);
    if (!ok) setRevealToken(true);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm motion-safe:animate-fade-in sm:items-center sm:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-subtitle`}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-800 bg-slate-900 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 motion-safe:animate-pop-in sm:rounded-3xl"
      >
        <header className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30">
            <SmartphoneIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-base font-semibold text-slate-100">
              Sync iPhone Health
            </h2>
            <p id={`${id}-subtitle`} className="mt-0.5 text-sm text-slate-400">
              Free: Apple’s built-in Shortcuts app sends your daily totals here. No developer account or App Store app needed.
            </p>
          </div>
          <IconButton ref={closeButtonRef} label="Close" onClick={onClose} className="-mt-1 -mr-2 shrink-0">
            <CloseIcon className="size-5" />
          </IconButton>
        </header>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Your sync URL</p>
            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/60 py-1 pr-1 pl-3">
              <code className="min-w-0 flex-1 truncate text-sm text-slate-200" title={HEALTH_SYNC_URL}>
                {HEALTH_SYNC_URL}
              </code>
              <CopyButton copied={copiedKey === 'url'} label="Copy sync URL" onClick={() => copy('url', HEALTH_SYNC_URL)} />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Auth token</p>
            {tokenState.status === 'error' ? (
              <ErrorMessage error={tokenState.error} onRetry={() => setReloadToken((n) => n + 1)} />
            ) : (
              <>
                <Button className="w-full" disabled={tokenState.status !== 'ready'} onClick={copyToken}>
                  {tokenState.status === 'loading' ? (
                    <SpinnerIcon className="size-4" />
                  ) : copiedKey === 'token' ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                  {tokenState.status === 'loading' ? 'Preparing token…' : copiedKey === 'token' ? 'Token copied' : 'Copy Auth Token'}
                </Button>
                {revealToken && tokenState.token ? (
                  <>
                    <textarea
                      readOnly
                      aria-label="Sync token"
                      value={tokenState.token}
                      onFocus={(event) => event.target.select()}
                      rows={3}
                      className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/60 p-2 font-mono text-xs break-all text-slate-200"
                    />
                    <p className="mt-1 text-xs text-amber-200/90">Couldn’t copy automatically. Select the token above and copy it.</p>
                  </>
                ) : (
                  tokenState.token && (
                    <p className="mt-1.5 truncate font-mono text-xs text-slate-500">{maskToken(tokenState.token)}</p>
                  )
                )}
                {tokenState.expiresAt && (
                  <p className="mt-1 text-xs text-slate-500">
                    Valid until {expiryFormatter.format(new Date(tokenState.expiresAt))}. It can only send activity to
                    TrackFit, but keep it private.
                  </p>
                )}
              </>
            )}
          </div>

          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-brand-400">
                  {index + 1}
                </span>
                <div className="min-w-0 text-sm text-slate-400 [&_b]:font-semibold [&_b]:text-slate-200">
                  <p className="font-semibold text-slate-100">{step.title}</p>
                  <p className="mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Request body</p>
              <CopyButton copied={copiedKey === 'body'} label="Copy example body" onClick={() => copy('body', EXAMPLE_BODY)} />
            </div>
            <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">
              {EXAMPLE_BODY}
            </pre>
            <p className="mt-1.5 text-xs text-slate-500">
              Each run replaces that day’s totals, so syncing several times a day is fine. Optional:{' '}
              <Code>exerciseType</Code>, <Code>durationMinutes</Code>.
            </p>
          </div>
        </div>

        <Button variant="ghost" className="mt-5 w-full border border-slate-700" onClick={onClose}>
          Done
        </Button>
      </section>
    </div>,
    document.body,
  );
}
