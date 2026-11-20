const SIZE_CLASS = {
  sm: 'h-8 w-8 rounded-xl',
  md: 'h-12 w-12 rounded-2xl',
  lg: 'h-16 w-16 rounded-3xl',
};

/**
 * Brand mark with soft rounded edges — use everywhere the logo appears in UI.
 */
export function TrackFitLogo({ size = 'sm', alt = '', className = '' }) {
  const sizeClass = SIZE_CLASS[size] ?? SIZE_CLASS.sm;

  return (
    <img
      src="/trackfit-logo.png"
      alt={alt}
      className={`${sizeClass} object-cover shadow-sm ring-1 ring-black/5 ${className}`.trim()}
    />
  );
}
