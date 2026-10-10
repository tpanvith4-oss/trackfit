import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { acquireAudio, getAudioContext } from '../../services/audioEngine.js';

const TICK_MS = 1_000;
const STAGE_SECONDS = 20;
const FULL_VOLUME_AFTER_SECONDS = 60;
const START_VOLUME = 0.12;

/** Each stage rings faster, higher and harder. `beeps` are offsets (s) within each 1 s tick. */
export const ALARM_STAGES = [
  { label: 'Gentle', beeps: [0], everyOtherTick: true, frequency: 660, haptic: ImpactStyle.Light },
  { label: 'Rising', beeps: [0, 0.3], frequency: 784, haptic: ImpactStyle.Medium },
  { label: 'Insistent', beeps: [0, 0.2, 0.4], frequency: 880, haptic: ImpactStyle.Heavy },
  { label: 'Full', beeps: [0, 0.15, 0.3, 0.45], frequency: 1046, vibrateMs: 700 },
];

const ignore = () => {};

function pulseHaptics(stage) {
  if (stage.vibrateMs) Haptics.vibrate({ duration: stage.vibrateMs }).catch(ignore);
  else Haptics.impact({ style: stage.haptic }).catch(ignore);
}

function scheduleBeep(ctx, destination, at, frequency) {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  overtone.type = 'sine';
  overtone.frequency.value = frequency * 2;

  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(1, at + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);

  osc.connect(envelope);
  overtone.connect(envelope);
  envelope.connect(destination);
  osc.start(at);
  overtone.start(at);
  osc.stop(at + 0.25);
  overtone.stop(at + 0.25);
  osc.onended = () => envelope.disconnect();
}

/**
 * Starts an escalating alarm: synthesized chimes whose volume ramps up over a minute
 * while tempo, pitch and haptic strength step up every 20 s. Returns a stop function.
 */
export function startAlarmSignal({ onStageChange } = {}) {
  const ctx = getAudioContext();
  const release = ctx ? acquireAudio() : ignore;
  const master = ctx?.createGain();
  if (master) {
    master.gain.value = START_VOLUME;
    master.connect(ctx.destination);
  }

  const startedAt = Date.now();
  let tickCount = 0;
  let currentStage = -1;

  const tick = () => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const stageIndex = Math.min(ALARM_STAGES.length - 1, Math.floor(elapsed / STAGE_SECONDS));
    const stage = ALARM_STAGES[stageIndex];
    if (stageIndex !== currentStage) {
      currentStage = stageIndex;
      onStageChange?.(stageIndex);
    }

    const ringsThisTick = !stage.everyOtherTick || tickCount % 2 === 0;
    tickCount += 1;
    if (!ringsThisTick) return;

    pulseHaptics(stage);

    // A suspended context's clock is frozen; queuing beeps against it would fire them all at once on resume.
    if (!ctx || ctx.state !== 'running') return;
    const volume = START_VOLUME + (1 - START_VOLUME) * Math.min(1, elapsed / FULL_VOLUME_AFTER_SECONDS);
    master.gain.setTargetAtTime(volume, ctx.currentTime, 0.4);
    const base = ctx.currentTime + 0.05;
    stage.beeps.forEach((offset) => scheduleBeep(ctx, master, base + offset, stage.frequency));
  };

  tick();
  const intervalId = setInterval(tick, TICK_MS);

  return () => {
    clearInterval(intervalId);
    if (master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => {
        master.disconnect();
        release();
      }, 400);
    } else {
      release();
    }
  };
}
