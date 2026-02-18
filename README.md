# FLOW — Speed Reader

A minimalist speed reading app that presents text one word at a time, accelerating from 120 WPM to 650 WPM to help you read faster without losing comprehension.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for production

```bash
npm run build
npm run preview
```

## How it works

1. **Paste** text into the textarea, **drag & drop** a `.txt` file, or **load** a file via the picker.
2. Click **Parse & Read** to extract words (strips markdown, HTML, URLs, punctuation artifacts).
3. Hit **Start** — words appear at 120 WPM and ramp up to 650 WPM over the first 25% of the text.
4. The **amber pivot letter** in each word marks the optical center — keep your gaze fixed there.

## Project structure

```
src/
  components/
    Header.jsx / .module.css    — Logo + collapsible reading tips
    TextInput.jsx / .module.css — Textarea, drag-drop, file picker
    Reader.jsx / .module.css    — Word stage + progress bar + stats
    Controls.jsx / .module.css  — Play/pause and reset buttons
  hooks/
    useSpeedReader.js           — Timing engine with WPM ramp
  utils/
    parseText.js                — Text cleaning and word extraction
  styles/
    global.css                  — CSS variables, reset, scrollbar
  App.jsx / App.module.css      — Root layout, input→reader state
  main.jsx                      — ReactDOM entry
```
