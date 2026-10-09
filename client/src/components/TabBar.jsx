export function TabBar({ tabs, activeTab, onChange }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul role="tablist" className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = id === activeTab;
          return (
            <li key={id} role="presentation">
              <button
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={active}
                aria-controls={`panel-${id}`}
                onClick={() => onChange(id)}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition ${
                  active ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="size-6" />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
