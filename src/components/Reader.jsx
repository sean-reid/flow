import React, { useEffect, useRef, useState } from 'react';
import { useSpeedReader } from '../hooks/useSpeedReader';
import Controls from './Controls';
import styles from './Reader.module.css';

export default function Reader({ words, onReset }) {
  const { index, playing, wpm, toggle, reset } = useSpeedReader(words);
  const [flash, setFlash] = useState(false);
  const prevIndex = useRef(index);

  // trigger flash animation on word change
  useEffect(() => {
    if (index !== prevIndex.current) {
      setFlash(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFlash(true));
      });
      prevIndex.current = index;
    }
  }, [index]);

  const progress   = words.length ? index / words.length : 0;
  const word       = words[Math.min(index, words.length - 1)] ?? '';
  const isFinished = index >= words.length;

  function handleReset() {
    reset();
    onReset();
  }

  return (
    <div className={styles.stage}>
      {/* progress bar */}
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>

      {/* word display */}
      <div className={styles.wordWrap}>
        {/* focus guide lines */}
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

      {/* stats */}
      <div className={styles.stats}>
        <span className={styles.stat}>
          <span className={styles.statVal}>{wpm}</span>
          <span className={styles.statLabel}>wpm</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statVal}>{index}</span>
          <span className={styles.statLabel}>/ {words.length} words</span>
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
