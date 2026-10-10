import { acquireAudio, getAudioContext } from '../../services/audioEngine.js';

export const SLEEP_TIMER_MS = 45 * 60_000;
const FADE_OUT_SECONDS = 10 * 60;
const BUFFER_SECONDS = 12;
const FADE_IN_SECONDS = 3;
const STOP_FADE_SECONDS = 1.2;
const SILENCE = 0.0001;

const listeners = new Set();
let state = { status: 'stopped', volume: 0.6, timerEnabled: true, endsAt: null };
let nodes = null;
let stopTimeoutId = null;
let cachedBuffer = null;

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSnapshot = () => state;

/**
 * Brownian (1/f²) noise: integrated white noise through a leaky integrator. The tail is
 * de-trended so the last sample meets the first, letting the buffer loop without a click.
 */
function createBrownNoiseBuffer(ctx) {
  const length = Math.floor(ctx.sampleRate * BUFFER_SECONDS);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last;
    }

    const drift = data[length - 1] - data[0];
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      data[i] -= drift * (i / (length - 1));
      sum += data[i];
    }

    const mean = sum / length;
    let peak = 0;
    for (let i = 0; i < length; i += 1) {
      data[i] -= mean;
      peak = Math.max(peak, Math.abs(data[i]));
    }

    const scale = peak > 0 ? 0.9 / peak : 0;
    for (let i = 0; i < length; i += 1) data[i] *= scale;
  }

  return buffer;
}

const toGain = (volume) => Math.max(SILENCE, volume * volume);

/** Re-plans the gain envelope: ramp to the current volume, then fade to silence before the timer ends. */
function applyGainPlan(rampSeconds) {
  if (!nodes) return;
  const { ctx, gain } = nodes;
  const now = ctx.currentTime;
  const target = toGain(state.volume);
  const param = gain.gain;

  param.cancelScheduledValues(now);
  param.setValueAtTime(Math.max(SILENCE, param.value), now);
  param.linearRampToValueAtTime(target, now + rampSeconds);

  if (state.endsAt) {
    const remaining = Math.max(rampSeconds + 0.1, (state.endsAt - Date.now()) / 1000);
    const fadeStart = Math.max(now + rampSeconds, now + remaining - FADE_OUT_SECONDS);
    param.setValueAtTime(target, fadeStart);
    param.exponentialRampToValueAtTime(SILENCE, now + remaining);
  }
}

function scheduleAutoStop() {
  clearTimeout(stopTimeoutId);
  stopTimeoutId = state.endsAt ? setTimeout(() => stop(), Math.max(0, state.endsAt - Date.now())) : null;
}

export function start() {
  if (state.status === 'playing') return true;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const release = acquireAudio();
  cachedBuffer = cachedBuffer?.sampleRate === ctx.sampleRate ? cachedBuffer : createBrownNoiseBuffer(ctx);

  const source = ctx.createBufferSource();
  source.buffer = cachedBuffer;
  source.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 900;

  const gain = ctx.createGain();
  gain.gain.value = SILENCE;

  source.connect(lowpass).connect(gain).connect(ctx.destination);
  source.start();

  nodes = { ctx, source, gain, release };
  setState({ status: 'playing', endsAt: state.timerEnabled ? Date.now() + SLEEP_TIMER_MS : null });
  applyGainPlan(FADE_IN_SECONDS);
  scheduleAutoStop();
  return true;
}

export function stop() {
  clearTimeout(stopTimeoutId);
  stopTimeoutId = null;
  if (!nodes) return;

  const { ctx, source, gain, release } = nodes;
  nodes = null;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(SILENCE, gain.gain.value), now);
  gain.gain.exponentialRampToValueAtTime(SILENCE, now + STOP_FADE_SECONDS);
  source.stop(now + STOP_FADE_SECONDS);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
    release();
  };

  setState({ status: 'stopped', endsAt: null });
}

export function setVolume(volume) {
  setState({ volume: Math.min(1, Math.max(0, volume)) });
  applyGainPlan(0.15);
}

export function setTimerEnabled(timerEnabled) {
  setState({
    timerEnabled,
    endsAt: state.status === 'playing' && timerEnabled ? Date.now() + SLEEP_TIMER_MS : null,
  });
  applyGainPlan(0.15);
  scheduleAutoStop();
}
