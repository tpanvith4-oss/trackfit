import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthToken } from '../../api/authSession.js';
import { getLiveWsUrl } from '../../api/foodApi.js';
import { AudioWaveIcon, CheckIcon, MicIcon, MicOffIcon, SpinnerIcon, SquareStopIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { formatNumber } from '../../utils/number.js';

function float32ToPcm16Base64(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function pcm16Base64ToFloat32(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samples = Math.floor(bytes.byteLength / 2);
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    out[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return out;
}

/**
 * Real-time bidirectional voice nutrition coach powered by Gemini Live API (gemini-3.8-live).
 * Streams 16kHz PCM mic audio to the server WebSocket and plays back 24kHz PCM responses gaplessly.
 * When the coach stages a meal via tool calling, `onMealDraft` displays the calculated macros
 * in the UI so the user can inspect and click "Record Meal" to save.
 */
export function LiveVoiceCoach({ onMealDraft, onRecordDraft, isRecordingMeal = false }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'connecting' | 'live'
  const [muted, setMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [stagedDraft, setStagedDraft] = useState(null);
  const [savedNotice, setSavedNotice] = useState(null);

  const wsRef = useRef(null);
  const inputCtxRef = useRef(null);
  const outputCtxRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const mutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef(new Set());
  const onMealDraftRef = useRef(onMealDraft);
  onMealDraftRef.current = onMealDraft;

  const stopOutputPlayback = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // ignore already-stopped sources
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    }
  }, []);

  const scheduleOutputAudio = useCallback((base64Pcm) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const samples = pcm16Base64ToFloat32(base64Pcm);
    if (samples.length === 0) return;

    const audioBuffer = ctx.createBuffer(1, samples.length, 24000);
    audioBuffer.copyToChannel(samples, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.01, nextStartTimeRef.current);
    nextStartTimeRef.current = startAt + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
    };
    source.start(startAt);
  }, []);

  const disconnect = useCallback(() => {
    stopOutputPlayback();
    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }

    if (outputCtxRef.current) {
      outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
    }

    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }

    setStatus('idle');
    setMicLevel(0);
    setMuted(false);
    mutedRef.current = false;
  }, [stopOutputPlayback]);

  useEffect(() => () => disconnect(), [disconnect]);

  const appendTranscript = useCallback((role, chunk) => {
    const clean = chunk ?? '';
    if (!clean) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.finalized) {
        return [...prev.slice(0, -1), { ...last, text: `${last.text}${clean}` }];
      }
      return [...prev.slice(-14), { id: `${Date.now()}-${Math.random()}`, role, text: clean, finalized: false }];
    });
  }, []);

  const finalizeTurns = useCallback(() => {
    setMessages((prev) => prev.map((m) => (m.finalized ? m : { ...m, finalized: true })));
  }, []);

  const startSession = useCallback(async () => {
    if (status !== 'idle') return;
    setError(null);
    setSavedNotice(null);
    setStatus('connecting');

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Sign in first to start a live voice session.');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const ws = new WebSocket(getLiveWsUrl(token));
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready') {
            setStatus('live');
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (audioEvent) => {
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
              const channel = audioEvent.inputBuffer.getChannelData(0);
              if (mutedRef.current) {
                setMicLevel(0);
                return;
              }
              let sumSq = 0;
              for (let i = 0; i < channel.length; i += 1) {
                sumSq += channel[i] * channel[i];
              }
              const rms = Math.sqrt(sumSq / channel.length);
              setMicLevel(Math.min(1, rms * 5.5));
              wsRef.current.send(JSON.stringify({ type: 'audio', data: float32ToPcm16Base64(channel) }));
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          } else if (msg.type === 'audio' && msg.data) {
            scheduleOutputAudio(msg.data);
          } else if (msg.type === 'input_transcript' && msg.text) {
            appendTranscript('user', msg.text);
          } else if (msg.type === 'output_transcript' && msg.text) {
            appendTranscript('coach', msg.text);
          } else if (msg.type === 'turn_complete') {
            finalizeTurns();
          } else if (msg.type === 'interrupted') {
            stopOutputPlayback();
            finalizeTurns();
          } else if (msg.type === 'meal_draft' && msg.draft) {
            setStagedDraft(msg.draft);
            setSavedNotice(null);
            onMealDraftRef.current?.(msg.draft);
          } else if (msg.type === 'error') {
            setError(new Error(msg.message || 'Voice session error.'));
            disconnect();
          } else if (msg.type === 'closed') {
            disconnect();
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError(new Error('Could not connect to the Live voice coach.'));
        disconnect();
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          disconnect();
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Microphone permission or Live session failed.'));
      disconnect();
    }
  }, [appendTranscript, disconnect, finalizeTurns, scheduleOutputAudio, status, stopOutputPlayback]);

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  };

  const handleSendText = (event) => {
    event.preventDefault();
    const clean = textInput.trim();
    if (!clean || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'text', text: clean }));
    setMessages((prev) => [...prev.slice(-14), { id: `${Date.now()}`, role: 'user', text: clean, finalized: true }]);
    setTextInput('');
  };

  const handleRecordStaged = async () => {
    if (!stagedDraft || !onRecordDraft || isRecordingMeal) return;
    try {
      await onRecordDraft(stagedDraft);
      setSavedNotice(`Recorded "${stagedDraft.mealTitle}" (${formatNumber(stagedDraft.totalCalories)} kcal)`);
      setStagedDraft(null);
    } catch (err) {
      setError(err);
    }
  };

  const isLive = status === 'live';
  const isConnecting = status === 'connecting';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AudioWaveIcon className="size-4 shrink-0 text-brand-400" />
            <span className="text-sm font-semibold text-slate-100">Live Voice Nutrition Coach</span>
            {isLive && (
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Talk naturally about what you ate. Macros appear in the UI for you to review and record.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isLive && (
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
              className={`inline-flex size-9 items-center justify-center rounded-xl border transition ${
                muted
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                  : 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-slate-500'
              }`}
            >
              {muted ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
            </button>
          )}

          {status === 'idle' ? (
            <Button type="button" onClick={startSession} className="px-3.5 py-2 text-xs">
              <MicIcon className="size-3.5" />
              Start Live
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={disconnect}
              disabled={isConnecting}
              className="border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/25"
            >
              {isConnecting ? <SpinnerIcon className="size-3.5" /> : <SquareStopIcon className="size-3.5" />}
              {isConnecting ? 'Connecting…' : 'End'}
            </Button>
          )}
        </div>
      </div>

      {isLive && (
        <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/75 p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {muted ? 'Mic muted' : 'Mic input'}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-400 transition-[width] duration-75"
                style={{ width: `${Math.round(micLevel * 100)}%` }}
              />
            </div>
          </div>

          {messages.length > 0 ? (
            <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-2.5 py-1.5 leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-6 bg-slate-800/80 text-slate-100'
                      : 'mr-6 border border-brand-500/20 bg-brand-500/10 text-slate-200'
                  }`}
                >
                  <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {m.role === 'user' ? 'You' : 'Coach'}
                  </span>
                  {m.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Try saying: “I just had 3 boiled eggs, 150g cooked rice, and a bowl of dal for lunch.”
            </p>
          )}

          <form onSubmit={handleSendText} className="flex gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type a message into the live session…"
              className="py-1.5 text-xs"
            />
            <Button type="submit" variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" disabled={!textInput.trim()}>
              Send
            </Button>
          </form>
        </div>
      )}

      {stagedDraft && (
        <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">
                Ready from Live Coach
              </p>
              <p className="truncate text-sm font-semibold text-slate-100">{stagedDraft.mealTitle}</p>
              <p className="mt-0.5 text-xs tabular-nums text-slate-300">
                {formatNumber(stagedDraft.totalCalories)} kcal · P {stagedDraft.totalProtein}g · C {stagedDraft.totalCarbs}g · F {stagedDraft.totalFat}g
              </p>
            </div>
            <Button
              type="button"
              onClick={handleRecordStaged}
              disabled={isRecordingMeal}
              className="shrink-0 px-3 py-2 text-xs"
            >
              {isRecordingMeal ? <SpinnerIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
              Record Meal
            </Button>
          </div>
        </div>
      )}

      {savedNotice && (
        <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CheckIcon className="size-3.5 shrink-0" />
          {savedNotice}
        </p>
      )}

      <ErrorMessage error={error} />
    </div>
  );
}
