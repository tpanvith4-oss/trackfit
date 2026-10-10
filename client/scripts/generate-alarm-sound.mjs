// Synthesizes the native wake-alarm notification tone into the Android project, mirroring
// the in-app "Full" alarm stage, so the APK ships no third-party audio assets.
// Runs after `cap sync` because the android/ folder is generated and git-ignored.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANDROID_RES = resolve(dirname(fileURLToPath(import.meta.url)), '../android/app/src/main/res');
const OUTPUT = resolve(ANDROID_RES, 'raw/trackfit_alarm.wav');

const SAMPLE_RATE = 22_050;
const FREQUENCY = 1046;
const BEEP_OFFSETS = [0, 0.15, 0.3, 0.45];
const BURSTS = 3;
const BURST_EVERY_S = 1;
const BEEP_S = 0.22;
const ATTACK_S = 0.012;
const PEAK = 0.85;

function beepSample(t) {
  if (t < 0 || t > BEEP_S) return 0;
  const envelope = t < ATTACK_S ? t / ATTACK_S : Math.exp((-(t - ATTACK_S) * 9.2) / (BEEP_S - ATTACK_S));
  const phase = (t * FREQUENCY) % 1;
  const triangle = 4 * Math.abs(phase - 0.5) - 1;
  const overtone = Math.sin(2 * Math.PI * 2 * FREQUENCY * t);
  return envelope * (0.7 * triangle + 0.3 * overtone);
}

function synthesize() {
  const length = Math.ceil(((BURSTS - 1) * BURST_EVERY_S + BEEP_OFFSETS.at(-1) + BEEP_S + 0.05) * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let burst = 0; burst < BURSTS; burst += 1) {
    for (const offset of BEEP_OFFSETS) {
      const start = burst * BURST_EVERY_S + offset;
      const first = Math.floor(start * SAMPLE_RATE);
      const last = Math.min(length, Math.ceil((start + BEEP_S) * SAMPLE_RATE));
      for (let i = first; i < last; i += 1) samples[i] += beepSample(i / SAMPLE_RATE - start);
    }
  }
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0) || 1;
  return samples.map((s) => (s / peak) * PEAK);
}

function encodeWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  samples.forEach((s, i) => buffer.writeInt16LE(Math.round(s * 32_767), 44 + i * 2));
  return buffer;
}

if (!existsSync(ANDROID_RES)) {
  console.warn('[alarm-sound] android/ project not found; run `npm run android:add` first. Skipping.');
} else {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  const wav = encodeWav(synthesize());
  writeFileSync(OUTPUT, wav);
  console.log(`[alarm-sound] Wrote ${OUTPUT} (${(wav.length / 1024).toFixed(1)} KB)`);
}
