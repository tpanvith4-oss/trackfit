import { getApiStatusStyle } from './apiStatus.js';
import { ProfileMenu } from './ProfileMenu.jsx';

export function AppHeader({ apiStatus, user, onLogout }) {
  const status = getApiStatusStyle(apiStatus);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <h1 className="text-lg font-bold tracking-tight">
          Track<span className="text-brand-400">Fit</span>
        </h1>
        {user ? (
          <ProfileMenu user={user} apiStatus={apiStatus} onLogout={onLogout} />
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300">
            <span className={`size-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        )}
      </div>
    </header>
  );
}
