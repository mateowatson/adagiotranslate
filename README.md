# Adagio Translate

Adagio Translate is a client-side translation workspace for segment-based translation projects in the browser.

## Important Disclosure

This is a **vibe-coded project produced with Codex**. I used AI assistance to design and implement the app, including the writing of this README.

## Why I Built It

I used to work with similar tools doing freelance translation, especially **OmegaT**, and I drew direct inspiration from that workflow. I wanted a lightweight, browser-based version of that experience without requiring a backend.

## What the app does

- Imports documents and creates translation projects
- Splits text into segments for translation
- Lets me translate segment-by-segment inline
- Keeps terminology consistent with a glossary
- Saves projects locally and supports export/import
- Exports translated output to Markdown and DOCX
- Offers optional machine translation

## Why I like glossaries

The glossary helps keep terminology consistent across a project so repeated terms stay aligned and the final translation reads as a cohesive whole.

## Tech stack

- React (client-side only, component-based)
- HTML and CSS
- JavaScript ES modules
- Browser storage APIs (`localStorage`)
- File System Access API where available (with fallbacks)
- Mammoth.js for `.docx` import
- DOCX export library
- Optional machine translation APIs

## Notes

This project is intentionally client-side only. Project data and local settings stay in the browser. The export and save functions will save a file to your machine.
