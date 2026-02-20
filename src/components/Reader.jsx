import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSpeedReader, DEFAULT_PEAK_WPM } from '../hooks/useSpeedReader';
import Controls from './Controls';
import styles from './Reader.module.css';

const MIN_WPM  = 100;
const MAX_CEIL = 1200;

export default function Reader({ words, onReset }) {
  const [maxWpm, setMaxWpm] = useState(DEFAULT_PEAK_WPM);
  const { index, playing, wpm, toggle, reset, seek } = useSpeedReader(words, maxWpm);

  const [flash, setFlash] = useState(false);
  const prevIndex = useRef(index);

  useEffect(() => {
    if (index !== prevIndex.current) {
      setFlash(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFlash(true));
      });
      prevIndex.current = index;
    }
  }, [index]);

  // ── Seek via progress bar ──────────────────────────────
  const trackRef   = useRef(null);
  const seekingRef = useRef(false);

  const posToIndex = useCallback((clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (words.length - 1));
  }, [words.length]);

  const onPointerDown = useCallback((e) => {
    seekingRef.current = true;
    trackRef.current.setPointerCapture(e.pointerId);
    seek(posToIndex(e.clientX));
  }, [seek, posToIndex]);

  const onPointerMove = useCallback((e) => {
    if (!seekingRef.current) return;
    seek(posToIndex(e.clientX));
  }, [seek, posToIndex]);

  const onPointerUp = useCallback(() => {
    seekingRef.current = false;
  }, []);

  // ── Max speed control ──────────────────────────────────
  const [wpmInput, setWpmInput] = useState(String(DEFAULT_PEAK_WPM));

  const commitWpm = useCallback(() => {
    const parsed = parseInt(wpmInput, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(MIN_WPM, Math.min(MAX_CEIL, parsed));
      setMaxWpm(clamped);
      setWpmInput(String(clamped));
    } else {
      setWpmInput(String(maxWpm));
    }
  }, [wpmInput, maxWpm]);

  const progress   = words.length ? index / words.length : 0;
  const word       = words[Math.min(index, words.length - 1)] ?? '';
  const isFinished = index >= words.length;

  function handleReset() {
    reset();
    onReset();
  }

  return (
    <div className={styles.stage}>
      {/* seekable progress bar */}
      <div
        ref={trackRef}
        className={styles.progressTrack}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title="Seek"
      >
        <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>

      {/* word display */}
      <div className={styles.wordWrap}>
        <div className={styles.guideLine} />
        <div className={`${styles.word} ${flash ? styles.flash : ''}`}>
          {isFinished ? (
            <span className={styles.done}>— end —</span>
          ) : (
            <>
              <span className={styles.wordLeft}>{word.slice(0, Math.ceil(word.length / 2))}</span>
              <span className={styles.wordPivot}>{word[Math.ceil(word.length / 2)]}</span>
              <span className={styles.wordRight}>{word.slice(Math.ceil(word.length / 2) + 1)}</span>
            </>
          )}
        </div>
      </div>

      {/* stats + max speed */}
      <div className={styles.stats}>
        <span className={styles.stat}>
          <span className={styles.statVal}>{wpm}</span>
          <span className={styles.statLabel}>wpm</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statVal}>{index}</span>
          <span className={styles.statLabel}>/ {words.length} words</span>
        </span>
        <span className={styles.stat} title="Peak WPM ceiling">
          <input
            className={styles.maxWpmInput}
            type="number"
            min={MIN_WPM}
            max={MAX_CEIL}
            value={wpmInput}
            onChange={e => setWpmInput(e.target.value)}
            onBlur={commitWpm}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
          />
          <span className={styles.statLabel}>max</span>
        </span>
      </div>

      <Controls
        playing={playing}
        isFinished={isFinished}
        onToggle={toggle}
        onReset={handleReset}
      />
    </div>
  );
}
