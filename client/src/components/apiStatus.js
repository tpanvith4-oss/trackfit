export const API_STATUS_STYLES = {
  checking: { dot: 'bg-slate-400 animate-pulse', label: 'Connecting' },
  online: { dot: 'bg-brand-400', label: 'Online' },
  degraded: { dot: 'bg-amber-400', label: 'DB offline' },
  offline: { dot: 'bg-rose-500', label: 'Offline' },
};

export const getApiStatusStyle = (status) => API_STATUS_STYLES[status] ?? API_STATUS_STYLES.checking;
