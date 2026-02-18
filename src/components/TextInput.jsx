import React, { useState, useRef } from 'react';
import { parseText } from '../utils/parseText';
import styles from './TextInput.module.css';

export default function TextInput({ onWords }) {
  const [dragging, setDragging] = useState(false);
  const [text, setText]         = useState('');
  const fileRef = useRef(null);

  function handleText(raw) {
    const words = parseText(raw);
    if (words.length) onWords(words);
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('text')) return;
    const reader = new FileReader();
    reader.onload = e => { setText(e.target.result); handleText(e.target.result); };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSubmit() {
    if (text.trim()) handleText(text);
  }

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragOver : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          className={styles.textarea}
          placeholder="Paste your text here…"
          value={text}
          onChange={e => setText(e.target.value)}
          spellCheck={false}
        />
        <div className={styles.dropHint}>
          {dragging ? 'release to load' : 'drag & drop a .txt file anywhere here'}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.fileBtn} onClick={() => fileRef.current.click()}>
          load file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          onChange={e => handleFile(e.target.files[0])}
        />
        <button
          className={styles.startBtn}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          parse &amp; read →
        </button>
      </div>
    </div>
  );
}
