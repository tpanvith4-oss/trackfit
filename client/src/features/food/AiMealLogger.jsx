import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { foodApi } from '../../api/foodApi.js';
import {
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  MicIcon,
  SparklesIcon,
  SpinnerIcon,
  SquareStopIcon,
} from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { formatNumber } from '../../utils/number.js';

const MIN_DESCRIPTION = 2;
const MAX_DESCRIPTION = 500;

const localTimeNow = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

function ItemChip({ item }) {
  return (
    <li className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-slate-100">{item.name}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-200">
          {formatNumber(item.calories)} <span className="text-xs font-normal text-slate-500">kcal</span>
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px] tabular-nums text-slate-400">
        <span className="min-w-0 truncate">{item.quantity || 'Typical serving'}</span>
        <span className="shrink-0">
          P {item.protein}g · C {item.carbs}g · F {item.fat}g
        </span>
      </div>
    </li>
  );
}

function EstimateBreakdown({ estimate, panelId, onRecord, isRecording }) {
  const [expanded, setExpanded] = useState(true);
  const count = estimate.items?.length ?? 0;
  const sources = estimate.sources ?? [];

  return (
    <div className="rounded-xl border border-brand-500/30 bg-brand-500/5">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((open) => !open)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-brand-300">{estimate.mealTitle}</span>
            <span className="block text-[11px] text-slate-400">
              {count} {count === 1 ? 'item' : 'items'} · {formatNumber(estimate.totalCalories)} kcal
              {estimate.grounded ? ' · Google Search verified' : ''}
            </span>
          </span>
          <ChevronDownIcon className={`size-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {onRecord && (
          <Button
            type="button"
            onClick={() => onRecord(estimate)}
            disabled={isRecording}
            className="shrink-0 px-3 py-1.5 text-xs"
          >
            {isRecording ? <SpinnerIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
            Record Meal
          </Button>
        )}
      </div>

      {/* Calculated Macro Summary Strip */}
      <div className="grid grid-cols-4 gap-1.5 border-t border-slate-800/80 px-3 py-2 text-center tabular-nums">
        <div className="rounded-lg bg-slate-950/60 px-2 py-1.5">
          <span className="block text-[10px] uppercase text-slate-500">Calories</span>
          <span className="text-xs font-bold text-slate-100">{formatNumber(estimate.totalCalories)}</span>
        </div>
        <div className="rounded-lg bg-slate-950/60 px-2 py-1.5">
          <span className="block text-[10px] uppercase text-emerald-400/80">Protein</span>
          <span className="text-xs font-bold text-emerald-300">{estimate.totalProtein}g</span>
        </div>
        <div className="rounded-lg bg-slate-950/60 px-2 py-1.5">
          <span className="block text-[10px] uppercase text-sky-400/80">Carbs</span>
          <span className="text-xs font-bold text-sky-300">{estimate.totalCarbs}g</span>
        </div>
        <div className="rounded-lg bg-slate-950/60 px-2 py-1.5">
          <span className="block text-[10px] uppercase text-amber-400/80">Fat</span>
          <span className="text-xs font-bold text-amber-300">{estimate.totalFat}g</span>
        </div>
      </div>

      {expanded && (
        <div id={panelId} className="space-y-2 px-3 pb-3 pt-1">
          {count > 0 && (
            <ul className="space-y-1.5" aria-label="Estimated items">
              {estimate.items.map((item, index) => (
                <ItemChip key={`${index}-${item.name}`} item={item} />
              ))}
            </ul>
          )}

          {sources.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <GlobeIcon className="size-3 text-sky-400" />
                Verified via Google Search
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-full truncate rounded-md border border-slate-700/80 bg-slate-900 px-2 py-0.5 text-[11px] text-sky-300 transition hover:border-sky-400/60 hover:text-sky-200"
                  >
                    {src.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Voice-or-text meal entry:
 * 1. Record audio (transcribed via gemini-3.5-transcribe) or type what you ate.
 * 2. Calculates accurate macros using gemini-4-hydrogen + Google Search grounding.
 * 3. Displays calculated macros + sources in the UI and lets you record with one click
 *    or tweak the pre-filled fields below.
 */
export function AiMealLogger({ onEstimate, onRecordEstimate, externalEstimate = null, disabled = false }) {
  const id = useId();
  const [description, setDescription] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [error, setError] = useState(null);
  const [estimate, setEstimate] = useState(externalEstimate);

  const controllerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (externalEstimate) {
      setEstimate(externalEstimate);
      setDescription(externalEstimate.mealTitle || '');
      setError(null);
    }
  }, [externalEstimate]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    },
    [],
  );

  const runEstimate = useCallback(
    async (rawText) => {
      const text = rawText.trim();
      if (text.length < MIN_DESCRIPTION) {
        setError(new Error('Describe what you ate, e.g. "2 rotis with dal and curd".'));
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsEstimating(true);
      setError(null);
      try {
        const result = await foodApi.aiParse({ description: text, localTime: localTimeNow() }, { signal: controller.signal });
        setEstimate(result);
        onEstimate(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err);
      } finally {
        if (controllerRef.current === controller) setIsEstimating(false);
      }
    },
    [onEstimate],
  );

  const handleEstimate = (event) => {
    event.preventDefault();
    runEstimate(description);
  };

  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      mediaRecorderRef.current?.stop();
      setIsRecordingAudio(false);
      return;
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (blob.size < 200) {
          setError(new Error('Recording was too short. Hold and speak your meal clearly.'));
          return;
        }
        setIsTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const { transcript } = await foodApi.transcribe({ audioBase64, mimeType });
          setDescription(transcript);
          await runEstimate(transcript);
        } catch (err) {
          setError(err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecordingAudio(true);
    } catch {
      setError(new Error('Microphone access denied. Allow mic access or type your meal instead.'));
      setIsRecordingAudio(false);
    }
  };

  const busy = disabled || isEstimating || isTranscribing;

  return (
    <form onSubmit={handleEstimate} className="space-y-2.5" aria-busy={isEstimating || isTranscribing}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`${id}-describe`} className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
          <SparklesIcon className="size-3.5 text-brand-400" />
          Speak or type your food
        </label>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
          <GlobeIcon className="size-3 text-sky-400" />
          Search-grounded macros
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleAudioRecording}
          disabled={disabled || isEstimating || isTranscribing}
          aria-label={isRecordingAudio ? 'Stop recording meal audio' : 'Record meal audio for transcription'}
          title={isRecordingAudio ? 'Stop & transcribe' : 'Dictate food (audio transcription)'}
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-50 ${
            isRecordingAudio
              ? 'border-rose-500 bg-rose-500/20 text-rose-300'
              : 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-brand-500/60 hover:text-brand-300'
          }`}
        >
          {isTranscribing ? (
            <SpinnerIcon className="size-4" />
          ) : isRecordingAudio ? (
            <SquareStopIcon className="size-4" />
          ) : (
            <MicIcon className="size-4" />
          )}
        </button>

        <Input
          id={`${id}-describe`}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setError(null);
          }}
          placeholder="e.g. 200g cooked rice, dal, 4 boiled eggs"
          maxLength={MAX_DESCRIPTION}
          autoComplete="off"
          enterKeyHint="go"
          disabled={busy || isRecordingAudio}
          className="min-w-0"
        />

        <Button type="submit" className="shrink-0 px-3.5" disabled={busy || isRecordingAudio}>
          {isEstimating ? <SpinnerIcon className="size-4" /> : <SparklesIcon className="size-4" />}
          Calculate
        </Button>
      </div>

      {isRecordingAudio && (
        <p role="status" className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200">
          <span>Listening… describe what you ate, then click Stop.</span>
          <button type="button" onClick={toggleAudioRecording} className="font-semibold underline">
            Stop &amp; Transcribe
          </button>
        </p>
      )}

      {isTranscribing && (
        <p role="status" className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <SpinnerIcon className="size-3.5 text-brand-400" />
          Transcribing your meal audio…
        </p>
      )}

      {isEstimating && (
        <p role="status" className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <SpinnerIcon className="size-3.5 text-brand-400" />
          Calculating verified macros with Google Search…
        </p>
      )}

      <ErrorMessage error={error} />

      {estimate && !isEstimating && !isTranscribing && (
        <EstimateBreakdown
          key={estimate.mealTitle + estimate.totalCalories}
          estimate={estimate}
          panelId={`${id}-items`}
          onRecord={onRecordEstimate}
          isRecording={disabled}
        />
      )}
    </form>
  );
}
