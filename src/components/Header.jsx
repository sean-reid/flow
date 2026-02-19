import React, { useState, useEffect } from 'react';
import styles from './Header.module.css';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('flow-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark';
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('flow-theme', theme); } catch {}
  }, [theme]);

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo}>FLOW</span>
        <span className={styles.tagline}>speed reader</span>
      </div>

      <div className={styles.headerActions}>
        <button
          className={styles.themeBtn}
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <span className={styles.themeIcon}>{theme === 'dark' ? '☀' : '☽'}</span>
        </button>
        <button
          className={styles.howBtn}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          {open ? 'close' : 'how to read'}
        </button>
      </div>

      {open && (
        <div className={styles.tips}>
          <p>
            <span className={styles.rule}>01</span>
            Fix your gaze at the center of the screen — don't let your eyes drift.
          </p>
          <p>
            <span className={styles.rule}>02</span>
            <span>Do <em>not</em> sub-vocalize. Silence the inner voice that reads each word aloud.</span>
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
