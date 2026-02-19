import React, { useState, useRef } from 'react';
import { parseText } from '../utils/parseText';
import { extractText, ACCEPT_ATTR } from '../utils/parseEbook';
import styles from './TextInput.module.css';

export default function TextInput({ onWords }) {
  const [dragging, setDragging] = useState(false);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errMsg,   setErrMsg]   = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  function submitText(raw) {
    const words = parseText(raw);
    if (words.length) {
      setErrMsg('');
      onWords(words);
    } else {
      setErrMsg('No readable words found in this file.');
    }
  }

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setErrMsg('');
    try {
      const raw = await extractText(file);
      setText(raw);
      submitText(raw);
    } catch (e) {
      setErrMsg(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragOver : ''} ${loading ? styles.busy : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          className={styles.textarea}
          placeholder="Paste your text here…"
          value={text}
          onChange={e => { setText(e.target.value); setErrMsg(''); }}
          spellCheck={false}
          disabled={loading}
        />
        <div className={styles.dropHint}>
          {loading   ? `parsing ${fileName}…`
            : dragging ? 'release to load'
            : 'drop a file or paste text'}
        </div>
      </div>

      {errMsg && <p className={styles.error}>⚠ {errMsg}</p>}

      <div className={styles.actions}>
        <button
          className={styles.fileBtn}
          onClick={() => fileRef.current.click()}
          disabled={loading}
        >
          load file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={e => handleFile(e.target.files[0])}
        />
        <button
          className={styles.startBtn}
          onClick={() => submitText(text)}
          disabled={!text.trim() || loading}
        >
          {loading ? 'parsing…' : 'parse & read →'}
        </button>
      </div>
    </div>
  );
}
