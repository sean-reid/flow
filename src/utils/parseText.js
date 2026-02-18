/**
 * parseText — strips formatting artifacts and returns an array of clean words.
 * Removes: punctuation-only tokens, URLs, markdown syntax, numbers-only,
 * HTML tags, and trims surrounding non-alpha characters per word.
 */
export function parseText(raw) {
  return raw
    // collapse whitespace / newlines
    .replace(/\r\n|\r/g, '\n')
    // strip HTML tags
    .replace(/<[^>]+>/g, ' ')
    // strip markdown headers, bold, italic, code fences
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_`~]{1,3}/g, '')
    // strip URLs
    .replace(/https?:\/\/\S+/g, '')
    // strip email addresses
    .replace(/\S+@\S+\.\S+/g, '')
    // split on whitespace
    .split(/\s+/)
    // trim leading/trailing punctuation from each token
    .map(w => w.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, ''))
    // keep only tokens that contain at least one letter
    .filter(w => /[a-zA-Z]/.test(w));
}
