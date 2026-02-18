import { useState, useEffect, useRef, useCallback } from 'react';

const START_WPM      = 120;
const PEAK_WPM       = 650;
const RAMP_WORDS     = 80;  // fixed number of words to reach peak speed
const MIN_RAMP_WORDS = 10;  // floor for very short texts (never ramp in <10 words)
const MAX_RAMP_RATIO = 0.6; // cap ramp at 60% of total so short texts don't spend
                             // nearly all their time accelerating

function rampLength(total) {
  // For short texts, cap the ramp to MAX_RAMP_RATIO of total words,
  // but never below MIN_RAMP_WORDS (unless the text itself is that short).
  const ratioBasedCap = Math.floor(total * MAX_RAMP_RATIO);
  const floor = Math.min(MIN_RAMP_WORDS, total);
  return Math.max(floor, Math.min(RAMP_WORDS, ratioBasedCap));
}

function wpmForIndex(index, total) {
  const rampEnd = rampLength(total);
  if (index >= rampEnd) return PEAK_WPM;
  const t = index / rampEnd;
  // ease-in cubic — slow start, rapid finish
  return START_WPM + (PEAK_WPM - START_WPM) * (t * t * t);
}

export function useSpeedReader(words) {
  const [index,   setIndex]   = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wpm,     setWpm]     = useState(START_WPM);

  const timeoutRef = useRef(null);
  const indexRef   = useRef(0);
  const wordsRef   = useRef(words);

  // sync refs
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { indexRef.current = index; }, [index]);

  const stop = useCallback(() => {
    setPlaying(false);
    clearTimeout(timeoutRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setIndex(0);
    setWpm(START_WPM);
  }, [stop]);

  // schedule next word
  const schedule = useCallback((i) => {
    const total = wordsRef.current.length;
    if (i >= total) { stop(); return; }
    const currentWpm = wpmForIndex(i, total);
    setWpm(Math.round(currentWpm));
    const delay = 60000 / currentWpm;
    timeoutRef.current = setTimeout(() => {
      setIndex(i + 1);
      schedule(i + 1);
    }, delay);
  }, [stop]);

  useEffect(() => {
    if (!playing) return;
    schedule(indexRef.current);
    return () => clearTimeout(timeoutRef.current);
  }, [playing, schedule]);

  // reset when words change
  useEffect(() => { reset(); }, [words, reset]);

  const toggle = useCallback(() => {
    if (index >= words.length && words.length > 0) {
      setIndex(0);
      indexRef.current = 0;
      setPlaying(true);
    } else {
      setPlaying(p => !p);
    }
  }, [index, words.length]);

  return { index, playing, wpm, toggle, reset };
}
