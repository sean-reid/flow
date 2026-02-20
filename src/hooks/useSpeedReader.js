import { useState, useEffect, useRef, useCallback } from 'react';

const START_WPM      = 120;
export const DEFAULT_PEAK_WPM = 650;
const RAMP_WORDS     = 80;  // fixed number of words to reach peak speed
const MIN_RAMP_WORDS = 10;  // floor for very short texts (never ramp in <10 words)
const MAX_RAMP_RATIO = 0.6; // cap ramp at 60% of total so short texts don't spend
                             // nearly all their time accelerating

function rampLength(total) {
  const ratioBasedCap = Math.floor(total * MAX_RAMP_RATIO);
  const floor = Math.min(MIN_RAMP_WORDS, total);
  return Math.max(floor, Math.min(RAMP_WORDS, ratioBasedCap));
}

function wpmForIndex(index, total, peakWpm) {
  const rampEnd = rampLength(total);
  if (index >= rampEnd) return peakWpm;
  const t = index / rampEnd;
  // ease-in cubic — slow start, rapid finish
  return START_WPM + (peakWpm - START_WPM) * (t * t * t);
}

export function useSpeedReader(words, maxWpm = DEFAULT_PEAK_WPM) {
  const [index,   setIndex]   = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wpm,     setWpm]     = useState(START_WPM);

  const timeoutRef = useRef(null);
  const indexRef   = useRef(0);
  const wordsRef   = useRef(words);
  const maxWpmRef  = useRef(maxWpm);

  // sync refs
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { maxWpmRef.current = maxWpm; }, [maxWpm]);
  useEffect(() => { indexRef.current = index; }, [index]);

  const stop = useCallback(() => {
    setPlaying(false);
    clearTimeout(timeoutRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setIndex(0);
    indexRef.current = 0;
    setWpm(START_WPM);
  }, [stop]);

  // show word at i, then schedule i+1
  const schedule = useCallback((i) => {
    const total = wordsRef.current.length;
    if (i >= total) { stop(); return; }
    const currentWpm = wpmForIndex(i, total, maxWpmRef.current);
    setWpm(Math.round(currentWpm));
    setIndex(i);
    indexRef.current = i;
    const delay = 60000 / currentWpm;
    timeoutRef.current = setTimeout(() => {
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
      indexRef.current = 0;
      setPlaying(true);
    } else {
      setPlaying(p => !p);
    }
  }, [index, words.length]);

  const seek = useCallback((newIndex) => {
    const clamped = Math.max(0, Math.min(newIndex, wordsRef.current.length - 1));
    clearTimeout(timeoutRef.current);
    setIndex(clamped);
    indexRef.current = clamped;
    if (playing) {
      schedule(clamped);
    }
  }, [playing, schedule]);

  return { index, playing, wpm, toggle, reset, seek };
}
