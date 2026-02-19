# Adagio Translate

Adagio Translate is a client-side translation workspace I built to make segment-based translation projects fast and practical in the browser.

I designed it as a lightweight, native-app-style tool for creating translation projects from imported documents, translating segment by segment, and keeping terminology consistent with a glossary.

## Important Disclosure

This is a **vibe-coded project produced with Codex**. I used AI assistance to design and implement the app, including the writing of most of this README.

## Why I Built It

I used to work with similar tools doing freelance translation, especially **OmegaT**, and I drew direct inspiration from that workflow:

- splitting text into segments
- translating per segment
- maintaining terminology consistency with glossary support

I wanted a modern, browser-based version of that kind of experience, without requiring a backend.

## What the App Does

Adagio Translate lets me:

- import documents and create translation projects in the browser
- set source and target languages when starting a project
- split imported text into segments by sentence or paragraph
- click a segment and translate inline (no separate translation pane)
- keep a translation project saved locally so I can refresh and continue
- export/import project files as JSON
- export translated target output as Markdown (`.md`)
- export translated target output as DOCX (`.docx`)
- add glossary entries and view relevant terms per selected segment
- auto-translate a selected segment using Google Cloud Translation API (optional)

## Full Feature List (Not fully tested, by a long shot)

- Native-style top navigation with `File`, `Edit`, `View`, and `Local Settings`
- Project lifecycle actions:
  - new project
  - import document
  - open existing project JSON
  - save project JSON / save as
  - export translated target text as Markdown (`.md`)
  - export translated target text as DOCX (`.docx`)
- Document import support for:
  - plain text-like formats (`.txt`, `.md`, `.csv`, etc.)
  - `.docx` with Markdown-oriented conversion
- `.docx` conversion behavior:
  - preserves compatible formatting as Markdown
  - normalizes bold markers to `**bold**`
  - removes escaped period artifacts (`\.`)
  - strips images from imported content
  - falls back to raw text extraction when needed
- Segmentation options:
  - sentence mode
  - paragraph mode
- Inline translation editing for the active segment:
  - translation appears below or beside source text depending on layout preference
- Glossary tools:
  - add entries manually
  - show only glossary terms found in the selected segment's source text
- Local persistence:
  - project state is stored in browser storage and restored on reload
- Local settings modal for machine translation configuration:
  - Google API key stored only in local browser storage
  - explicit note that API key is **not exported in project JSON**
- Optional machine translation:
  - per-segment Auto-Translate button shown near the active segment (only when key is configured)
- Edit menu actions for text fields:
  - undo / redo
  - cut / copy / paste
  - select all

## Why the Glossary Matters

For me, the glossary is one of the most important pieces for translation quality. It helps maintain terminology consistency across segments, so repeated terms are translated the same way throughout a document. That reduces drift, improves readability, and makes the final translation feel coherent.

## Tech Stack

- React (client-side only, component-based)
- HTML
- CSS
- JavaScript ES modules
- Browser storage APIs (`localStorage`)
- File System Access API where available (with browser fallbacks)
- Mammoth.js for `.docx` conversion
- Google Cloud Translation API (optional, user-provided key)
- MyMemory Translation API (optional, no-account fallback)

## Notes

This project is intentionally client-side only. Project data and local settings stay in the browser unless I explicitly export a project file.
