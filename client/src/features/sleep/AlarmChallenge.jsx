import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircleIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { createMathProblems, MATH_PROBLEM_COUNT, SHAKE_TARGET } from './alarmChallenges.js';
import { useShakeCounter } from './useShakeCounter.js';

function ProgressDots({ done, total }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i < done ? 'bg-amber-400' : 'bg-slate-700'}`} />
      ))}
    </div>
  );
}

function MathChallenge({ onSolved, notice }) {
  const id = useId();
  const [problems] = useState(createMathProblems);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);
  const problem = problems[index];

  useEffect(() => {
    inputRef.current?.focus();
  }, [index, attempt]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (answer.trim() === '') return;
    if (parseInt(answer, 10) !== problem.answer) {
      setError('Not quite — try again.');
      setAttempt((value) => value + 1);
      setShaking(true);
      setAnswer('');
      return;
    }
    setError(null);
    setAnswer('');
    if (index + 1 >= problems.length) onSolved();
    else setIndex(index + 1);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Problem {index + 1} of {MATH_PROBLEM_COUNT}
        </p>
        <ProgressDots done={index} total={MATH_PROBLEM_COUNT} />
      </div>
      {notice && <p className="text-xs text-amber-200/80">{notice}</p>}
      <label htmlFor={`${id}-answer`} className="block text-center text-4xl font-bold tabular-nums tracking-tight text-slate-50">
        {problem.prompt} = ?
      </label>
      <div className={shaking ? 'motion-safe:animate-shake-x' : undefined} onAnimationEnd={() => setShaking(false)}>
        <Input
          ref={inputRef}
          id={`${id}-answer`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={4}
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value.replace(/\D/g, ''));
            setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="Your answer"
          className="text-center text-2xl font-semibold tabular-nums"
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-center text-sm text-rose-300">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full py-3" disabled={answer === ''}>
        Check answer
      </Button>
    </form>
  );
}

function ShakeChallenge({ onSolved }) {
  const { count, sensorAvailable } = useShakeCounter(true);
  const solved = count >= SHAKE_TARGET;

  useEffect(() => {
    if (solved) onSolved();
  }, [solved, onSolved]);

  if (sensorAvailable === false) {
    return <MathChallenge onSolved={onSolved} notice="No motion sensor detected, so solve two quick sums instead." />;
  }

  const progress = Math.min(1, count / SHAKE_TARGET);
  return (
    <div className="space-y-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Shake your phone to unlock</p>
      <p className="text-5xl font-bold tabular-nums text-slate-50" aria-live="polite">
        {Math.min(count, SHAKE_TARGET)}
        <span className="text-2xl text-slate-500"> / {SHAKE_TARGET}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Shakes"
        aria-valuemin={0}
        aria-valuemax={SHAKE_TARGET}
        aria-valuenow={Math.min(count, SHAKE_TARGET)}
        className="h-2 overflow-hidden rounded-full bg-slate-800"
      >
        <div className="h-full rounded-full bg-amber-400 transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
      {sensorAvailable === null && <p className="text-xs text-slate-500">Waiting for the motion sensor…</p>}
    </div>
  );
}

export function AlarmChallenge({ type, solved, onSolved }) {
  if (solved) {
    return (
      <p className="flex items-center justify-center gap-2 py-6 text-sm font-semibold text-brand-400" role="status">
        <CheckCircleIcon className="size-5" /> Unlocked. You’re awake.
      </p>
    );
  }
  return type === 'shake' ? <ShakeChallenge onSolved={onSolved} /> : <MathChallenge onSolved={onSolved} />;
}
