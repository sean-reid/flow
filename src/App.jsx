import React, { useState } from 'react';
import Header from './components/Header';
import TextInput from './components/TextInput';
import Reader from './components/Reader';
import styles from './App.module.css';

export default function App() {
  const [words, setWords] = useState(null);

  return (
    <div className={styles.app}>
      <Header />

      <main className={styles.main}>
        {words === null ? (
          <section className={styles.inputSection}>
            <p className={styles.intro}>
              Load any text and let it flow through you.
            </p>
            <TextInput onWords={setWords} />
          </section>
        ) : (
          <Reader words={words} onReset={() => setWords(null)} />
        )}
      </main>

      <footer className={styles.footer}>
        <span>focus · flow · absorb</span>
      </footer>
    </div>
  );
}
