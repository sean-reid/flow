import React, { useState } from 'react';
import styles from './Header.module.css';

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo}>FLOW</span>
        <span className={styles.tagline}>speed reader</span>
      </div>

      <button
        className={styles.howBtn}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? 'close' : 'how to read'}
      </button>

      {open && (
        <div className={styles.tips}>
          <p>
            <span className={styles.rule}>01</span>
            Fix your gaze at the center of the screen — don't let your eyes drift.
          </p>
          <p>
            <span className={styles.rule}>02</span>
            Do <em>not</em> sub-vocalize. Silence the inner voice that reads each word aloud.
          </p>
          <p>
            <span className={styles.rule}>03</span>
            Trust the flow. Meaning arrives in phrases and rhythms, not individual words.
          </p>
          <p>
            <span className={styles.rule}>04</span>
            If you lose focus, pause — then resume. Speed will build naturally with practice.
          </p>
        </div>
      )}
    </header>
  );
}
