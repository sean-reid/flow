# FLOW Speed Reader

A minimalist, client-side speed reading app that flashes one word at a time using the **RSVP** (Rapid Serial Visual Presentation) technique. Words are highlighted at their optical center so your eyes stay still and your reading speed goes up.

## Features

- **Automatic speed ramp** — starts at 120 WPM and accelerates to 650 WPM over the first ~80 words using an ease-in cubic curve, so your brain can warm up before hitting full speed.
- **Optical pivot highlighting** — each word's focal letter is tinted amber, guiding your gaze to the natural reading center of the word.
- **Light & dark themes** — toggle between a warm parchment light mode and a deep-black dark mode via the header button. Your choice is saved across sessions.
- **Broad file support** — paste raw text or load any of these formats directly in the browser (no server, no upload):
  - Plain text & markup: `.txt`, `.md`, `.markdown`, `.html`, `.htm`
  - Ebooks: `.epub`, `.mobi`, `.azw`, `.azw3`, `.fb2`
  - Documents: `.pdf`, `.docx`, `.rtf`
- **Drag & drop** — drop a supported file anywhere on the input area to load it instantly.
- **Live stats** — progress bar and current WPM counter update in real time while reading.

> **Note:** `.kfx` (Amazon's proprietary encrypted format) is not supported. Convert to EPUB using [Calibre](https://calibre-ebook.com/) first.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
# Production build
npm run build
npm run preview
```

## How to use

1. **Load text** — paste into the textarea, drag and drop a file, or use the file picker.
2. Click **Parse & Read** — the app strips markdown syntax, HTML tags, URLs, and punctuation artifacts to produce a clean word list. Markdown files (`.md`) get full CommonMark-aware conversion (headers, links, images, code blocks, tables, and inline formatting are all resolved to plain text before word extraction).
3. Click **Start** — words begin flashing at 120 WPM and ramp up to 650 WPM.
4. Use **Pause/Resume** to stop and continue, or **Reset** to start over.

## How the speed ramp works

The timing engine (`src/hooks/useSpeedReader.js`) calculates a per-word delay using a cubic ease-in curve:

- **Ramp length** is normally 80 words, but is capped at 60% of the total word count so short texts don't spend most of their time accelerating.
- Once the ramp completes, every subsequent word is shown at the full 650 WPM peak.
- If you reach the end of the text, pressing Start again restarts from the beginning.

## Project structure

```
src/
  components/
    Header.jsx / .module.css     — Logo and collapsible reading tips panel
    TextInput.jsx / .module.css  — Textarea, drag-and-drop, file picker
    Reader.jsx / .module.css     — Word display, progress bar, live WPM
    Controls.jsx / .module.css   — Play/pause and reset buttons
  hooks/
    useSpeedReader.js            — Core timing engine; manages index, WPM, and playback state
  utils/
    parseText.js                 — Cleans raw text and extracts word list
    parseEbook.js                — Detects file type and dispatches to the right parser
                                   (includes Markdown→text converter, DOM-based HTML
                                   extraction, and a hand-rolled PalmDOC decompressor
                                   for MOBI/AZW)
  styles/
    global.css                   — CSS custom properties, reset, scrollbar styling
  App.jsx / App.module.css       — Root layout; manages input → reader state transition
  main.jsx                       — ReactDOM entry point
```

## Tech stack

- **React 18** with Vite
- **pdfjs-dist** for PDF text extraction
- **JSZip** for EPUB and DOCX unpacking
- All parsing happens entirely in the browser — no data leaves your device.
