let context = null;
let activeUsers = 0;

const AudioContextCtor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? window.webkitAudioContext);

export const isAudioSupported = () => Boolean(AudioContextCtor);

/** Lazily creates the single AudioContext shared by every synthesizer in the app. */
export function getAudioContext() {
  if (!context && AudioContextCtor) context = new AudioContextCtor({ latencyHint: 'playback' });
  return context;
}

/** Resumes the context; browsers reject this until the page has received a user gesture. */
export async function resumeAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}

/**
 * Marks the context as in use and resumes it. The returned release function
 * suspends the context once nothing is playing, so the audio hardware can sleep.
 */
export function acquireAudio() {
  activeUsers += 1;
  resumeAudio();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeUsers = Math.max(0, activeUsers - 1);
    if (activeUsers === 0 && context?.state === 'running') context.suspend().catch(() => {});
  };
}
