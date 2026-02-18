import React from 'react';
import styles from './Controls.module.css';

export default function Controls({ playing, isFinished, onToggle, onReset }) {
  return (
    <div className={styles.controls}>
      <button className={styles.resetBtn} onClick={onReset} title="Reset">
        ↺ new text
      </button>

      <button
        className={`${styles.playBtn} ${playing ? styles.pause : styles.play}`}
        onClick={onToggle}
      >
        {isFinished ? '↺ replay' : playing ? '⏸ pause' : '▶ start'}
      </button>
    </div>
  );
}
