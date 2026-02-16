const state = {
  project: {
    meta: {
      name: "Untitled Project",
      sourceLanguage: "",
      targetLanguage: "",
      splitMode: "sentence",
      editorPosition: "right",
      createdAt: null,
      updatedAt: null,
    },
    sourceText: "",
    segments: [],
    glossary: [],
  },
  activeSegmentId: null,
  pendingDocumentText: "",
  pendingDocumentName: "",
  fileHandle: null,
  projectHandle: null,
};
const LOCAL_STORAGE_KEY = "adagioTranslate.currentProject.v1";

const els = {
  workspace: document.getElementById("workspace"),
  projectMeta: document.getElementById("project-meta"),
  splitMode: document.getElementById("split-mode"),
  editorPosition: document.getElementById("editor-position"),
  segmentList: document.getElementById("segment-list"),
  segmentCount: document.getElementById("segment-count"),
  resegmentBtn: document.getElementById("resegment-btn"),

  glossaryList: document.getElementById("glossary-list"),
  addGlossaryBtn: document.getElementById("add-glossary-btn"),

  importDocBtn: document.getElementById("import-doc-btn"),
  openProjectBtn: document.getElementById("open-project-btn"),
  saveProjectBtn: document.getElementById("save-project-btn"),
  saveProjectAsBtn: document.getElementById("save-project-as-btn"),
  newProjectBtn: document.getElementById("new-project-btn"),

  docFileInput: document.getElementById("doc-file-input"),
  projectFileInput: document.getElementById("project-file-input"),

  projectSetupDialog: document.getElementById("project-setup-dialog"),
  projectSetupForm: document.getElementById("project-setup-form"),
  sourceLanguageInput: document.getElementById("source-language"),
  targetLanguageInput: document.getElementById("target-language"),
  setupSplitMode: document.getElementById("setup-split-mode"),
  setupCancelBtn: document.getElementById("setup-cancel-btn"),

  glossaryDialog: document.getElementById("glossary-dialog"),
  glossaryForm: document.getElementById("glossary-form"),
  glossaryTargetTerm: document.getElementById("glossary-target-term"),
  glossaryTranslation: document.getElementById("glossary-translation"),
  glossaryCancelBtn: document.getElementById("glossary-cancel-btn"),
};

let pendingGlossarySelection = "";

init();

function init() {
  bindMenuBehavior();
  bindProjectActions();
  bindEditActions();
  bindDialogs();
  bindSegmentEditor();
  loadProjectFromStorage();
  renderAll();
}

function bindMenuBehavior() {
  document.addEventListener("click", (event) => {
    const clickedInsideMenu = event.target.closest(".menu");
    if (clickedInsideMenu) {
      return;
    }
    document.querySelectorAll(".menu[open]").forEach((menu) => {
      menu.removeAttribute("open");
    });
  });
}

function bindProjectActions() {
  els.newProjectBtn.addEventListener("click", newProject);
  els.importDocBtn.addEventListener("click", importDocument);
  els.openProjectBtn.addEventListener("click", openProject);
  els.saveProjectBtn.addEventListener("click", () => saveProject(false));
  els.saveProjectAsBtn.addEventListener("click", () => saveProject(true));
  els.docFileInput.addEventListener("change", handleDocumentFileInput);
  els.projectFileInput.addEventListener("change", handleProjectFileInput);

  els.splitMode.addEventListener("change", () => {
    state.project.meta.splitMode = els.splitMode.value;
    resegmentFromSource();
  });

  els.editorPosition.addEventListener("change", () => {
    state.project.meta.editorPosition = els.editorPosition.value;
    applyEditorPosition();
    stampUpdated();
  });

  els.resegmentBtn.addEventListener("click", () => {
    resegmentFromSource();
  });
}

function bindEditActions() {
  document.querySelectorAll("[data-edit-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.editAction;
      if (action === "selectAll") {
        const active = document.activeElement;
        if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
          active.select();
        }
        return;
      }
      document.execCommand(action);
    });
  });

  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const mod = isMac ? event.metaKey : event.ctrlKey;
    if (!mod) {
      return;
    }

    if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveProject(event.shiftKey);
    }
  });
}

function bindDialogs() {
  els.addGlossaryBtn.addEventListener("click", () => openGlossaryDialog());

  els.projectSetupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const sourceLanguage = els.sourceLanguageInput.value.trim();
    const targetLanguage = els.targetLanguageInput.value.trim();
    const splitMode = els.setupSplitMode.value;

    if (!sourceLanguage || !targetLanguage) {
      return;
    }

    state.project.meta.sourceLanguage = sourceLanguage;
    state.project.meta.targetLanguage = targetLanguage;
    state.project.meta.splitMode = splitMode;

    els.splitMode.value = splitMode;
    segmentSourceText(state.pendingDocumentText || "");

    if (state.pendingDocumentName) {
      state.project.meta.name = stripExtension(state.pendingDocumentName);
    }

    state.pendingDocumentText = "";
    state.pendingDocumentName = "";
    stampUpdated();
    els.projectSetupDialog.close();
    renderAll();
  });

  els.setupCancelBtn.addEventListener("click", () => {
    state.pendingDocumentText = "";
    state.pendingDocumentName = "";
    els.projectSetupDialog.close();
  });

  els.glossaryForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const targetTerm = els.glossaryTargetTerm.value.trim();
    const translation = els.glossaryTranslation.value.trim();

    if (!targetTerm || !translation) {
      return;
    }

    upsertGlossaryEntry({
      targetTerm,
      translation,
      addedAt: new Date().toISOString(),
    });

    pendingGlossarySelection = "";
    els.glossaryDialog.close();
    renderGlossary();
    stampUpdated();
  });

  els.glossaryCancelBtn.addEventListener("click", () => {
    pendingGlossarySelection = "";
    els.glossaryDialog.close();
  });
}

function bindSegmentEditor() {
  els.segmentList.addEventListener("click", (event) => {
    const segmentItem = event.target.closest(".segment-item");
    if (!segmentItem) {
      return;
    }

    const segmentId = segmentItem.dataset.segmentId;
    if (!segmentId) {
      return;
    }

    if (state.activeSegmentId !== segmentId) {
      selectSegment(segmentId);
    }
  });

  els.segmentList.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLTextAreaElement) || !input.classList.contains("segment-translation-input")) {
      return;
    }

    const segmentId = input.dataset.segmentId;
    const segment = state.project.segments.find((item) => item.id === segmentId);
    if (!segment) {
      return;
    }

    segment.translation = input.value;
    stampUpdated();
    renderGlossary();
  });

  els.segmentList.addEventListener("contextmenu", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLTextAreaElement) || !input.classList.contains("segment-translation-input")) {
      return;
    }

    event.preventDefault();
    const selected = getSelectedTextInField(input);
    const inferred = selected || getWordAtCaret(input);
    if (!inferred) {
      return;
    }

    openGlossaryDialog(inferred);
  });
}

function openGlossaryDialog(defaultTerm = "") {
  pendingGlossarySelection = String(defaultTerm ?? "").trim();
  els.glossaryTargetTerm.value = pendingGlossarySelection;
  els.glossaryTranslation.value = "";
  els.glossaryDialog.showModal();
}

function newProject() {
  const confirmed = confirm("Start a new project? Unsaved changes in the current project will be lost.");
  if (!confirmed) {
    return;
  }

  state.project = {
    meta: {
      name: "Untitled Project",
      sourceLanguage: "",
      targetLanguage: "",
      splitMode: "sentence",
      editorPosition: "right",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    sourceText: "",
    segments: [],
    glossary: [],
  };

  state.activeSegmentId = null;
  state.projectHandle = null;
  state.fileHandle = null;
  persistProjectToStorage();
  renderAll();
}

async function importDocument() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Documents",
            accept: {
              "text/plain": [".txt", ".md", ".csv", ".log", ".srt"],
              "application/json": [".json"],
              "application/octet-stream": [".rtf"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            },
          },
        ],
      });

      state.fileHandle = handle;
      const file = await handle.getFile();
      await processImportedDocument(file);
      return;
    } catch (error) {
      if (error && error.name !== "AbortError") {
        console.error(error);
        alert("Could not open file picker. Falling back to standard upload.");
      }
    }
  }

  els.docFileInput.value = "";
  els.docFileInput.click();
}

async function handleDocumentFileInput() {
  const file = els.docFileInput.files?.[0];
  if (!file) {
    return;
  }
  await processImportedDocument(file);
}

async function processImportedDocument(file) {
  const text = await readTextFromFile(file);
  if (!text.trim()) {
    alert("The selected file has no readable text content.");
    return;
  }

  state.pendingDocumentText = text;
  state.pendingDocumentName = file.name;

  els.sourceLanguageInput.value = state.project.meta.sourceLanguage || "";
  els.targetLanguageInput.value = state.project.meta.targetLanguage || "";
  els.setupSplitMode.value = state.project.meta.splitMode || "sentence";
  els.projectSetupDialog.showModal();
}

async function readTextFromFile(file) {
  if (isDocxFile(file)) {
    const docxText = await readDocxAsMarkdown(file);
    if (docxText && docxText.trim()) {
      return docxText;
    }
  }

  const asText = await file.text();
  if (asText && asText.trim()) {
    return asText;
  }

  // Fallback for encoded files where text() may return empty values.
  const buffer = await file.arrayBuffer();
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function isDocxFile(file) {
  const name = (file?.name || "").toLowerCase();
  return (
    name.endsWith(".docx")
    || file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

async function readDocxAsMarkdown(file) {
  const mammothLib = window.mammoth;
  if (!mammothLib) {
    console.warn("Mammoth library not loaded; falling back to plain text read.");
    return "";
  }

  const buffer = await file.arrayBuffer();

  try {
    const markdownResult = await mammothLib.convertToMarkdown({ arrayBuffer: buffer });
    const markdownText = stripImagesFromMarkdown((markdownResult?.value || "").trim());
    if (markdownText) {
      return markdownText;
    }
  } catch (error) {
    console.warn("DOCX to Markdown conversion failed. Trying raw text fallback.", error);
  }

  try {
    const rawResult = await mammothLib.extractRawText({ arrayBuffer: buffer });
    return (rawResult?.value || "").trim();
  } catch (error) {
    console.warn("DOCX raw text extraction failed.", error);
    return "";
  }
}

function stripImagesFromMarkdown(markdown) {
  if (!markdown) {
    return "";
  }

  return markdown
    .replace(/__(?=\S)(.+?)(?<=\S)__/g, "**$1**")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/\\\./g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function segmentSourceText(text) {
  state.project.sourceText = text;
  const splitMode = state.project.meta.splitMode;
  const rawSegments = splitMode === "paragraph" ? splitByParagraph(text) : splitBySentence(text);

  state.project.segments = rawSegments.map((source, index) => ({
    id: `seg-${index + 1}`,
    source,
    translation: "",
    index,
  }));

  state.activeSegmentId = state.project.segments[0]?.id || null;
  if (!state.project.meta.createdAt) {
    state.project.meta.createdAt = new Date().toISOString();
  }

  renderAll();
}

function splitByParagraph(text) {
  return text
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitBySentence(text) {
  const normalized = text.replace(/\n+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const parts = normalized.match(/[^.!?。！？]+[.!?。！？]?/g) || [normalized];
  return parts.map((part) => part.trim()).filter(Boolean);
}

function resegmentFromSource() {
  if (!state.project.sourceText.trim()) {
    return;
  }
  segmentSourceText(state.project.sourceText);
  stampUpdated();
}

function selectSegment(segmentId) {
  state.activeSegmentId = segmentId;
  persistProjectToStorage();
  renderSegments();
  renderGlossary();
}

function getActiveSegment() {
  return state.project.segments.find((segment) => segment.id === state.activeSegmentId) || null;
}

function upsertGlossaryEntry(entry) {
  const existing = state.project.glossary.find(
    (item) => item.targetTerm.toLowerCase() === entry.targetTerm.toLowerCase()
  );

  if (existing) {
    existing.translation = entry.translation;
    existing.updatedAt = new Date().toISOString();
    return;
  }

  state.project.glossary.push(entry);
}

function getRelevantGlossaryEntries() {
  const segment = getActiveSegment();
  if (!segment) {
    return [];
  }

  const sourceText = (segment.source || "").toLowerCase();
  return state.project.glossary.filter((item) =>
    sourceText.includes(item.targetTerm.toLowerCase())
  );
}

async function saveProject(forceNewHandle) {
  stampUpdated();
  const payload = serializeProject();

  if (window.showSaveFilePicker) {
    try {
      let handle = state.projectHandle;
      if (!handle || forceNewHandle) {
        handle = await window.showSaveFilePicker({
          suggestedName: `${sanitizeFilename(state.project.meta.name || "adagio-project")}.adagio.json`,
          types: [
            {
              description: "Adagio Translate Project",
              accept: { "application/json": [".adagio.json"] },
            },
          ],
        });
      }

      const writable = await handle.createWritable();
      await writable.write(payload);
      await writable.close();

      state.projectHandle = handle;
      alert("Project saved.");
      return;
    } catch (error) {
      if (error && error.name !== "AbortError") {
        console.error(error);
        alert("Could not save via File System Access API. Downloading instead.");
      } else {
        return;
      }
    }
  }

  downloadTextFile(
    `${sanitizeFilename(state.project.meta.name || "adagio-project")}.adagio.json`,
    payload,
    "application/json"
  );
}

async function openProject() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Adagio Translate Project",
            accept: {
              "application/json": [".adagio.json", ".json"],
            },
          },
        ],
      });

      const file = await handle.getFile();
      await loadProjectFromFile(file);
      state.projectHandle = handle;
      return;
    } catch (error) {
      if (error && error.name !== "AbortError") {
        console.error(error);
        alert("Could not open file picker. Falling back to standard upload.");
      }
    }
  }

  els.projectFileInput.value = "";
  els.projectFileInput.click();
}

async function handleProjectFileInput() {
  const file = els.projectFileInput.files?.[0];
  if (!file) {
    return;
  }
  await loadProjectFromFile(file);
}

async function loadProjectFromFile(file) {
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);

    state.project = normalizeProjectData(parsed, stripExtension(file.name));

    state.activeSegmentId = state.project.segments[0]?.id || null;
    persistProjectToStorage();
    renderAll();
  } catch (error) {
    console.error(error);
    alert("The selected project file is invalid.");
  }
}

function rebuildSourceText(segments, splitMode = "sentence") {
  const delimiter = splitMode === "paragraph" ? "\n\n" : " ";
  return (segments || [])
    .map((segment) => segment.source || "")
    .filter(Boolean)
    .join(delimiter);
}

function serializeProject() {
  return JSON.stringify(
    {
      meta: {
        ...state.project.meta,
        editorPosition: state.project.meta.editorPosition,
      },
      sourceText: state.project.sourceText,
      segments: state.project.segments.map((segment) => ({
        id: segment.id,
        source: segment.source,
        translation: segment.translation,
      })),
      glossary: state.project.glossary,
    },
    null,
    2
  );
}

function renderAll() {
  renderMeta();
  renderSegments();
  renderGlossary();
  applyEditorPosition();
}

function renderMeta() {
  const { name, sourceLanguage, targetLanguage } = state.project.meta;
  const langText = sourceLanguage && targetLanguage ? `${sourceLanguage} -> ${targetLanguage}` : "No languages set";
  els.projectMeta.textContent = `${name} | ${langText}`;

  els.splitMode.value = state.project.meta.splitMode || "sentence";
  els.editorPosition.value = state.project.meta.editorPosition || "right";
}

function renderSegments() {
  els.segmentList.innerHTML = "";

  state.project.segments.forEach((segment, idx) => {
    const item = document.createElement("li");
    item.className = "segment-item";
    item.dataset.segmentId = segment.id;
    if (segment.id === state.activeSegmentId) {
      item.classList.add("active");
    }

    const translationStatus = segment.translation.trim() ? "translated" : "pending";
    item.title = `Status: ${translationStatus}`;

    const content = document.createElement("div");
    content.className = "segment-content";

    const source = document.createElement("div");
    source.className = "segment-source";
    source.textContent = `${idx + 1}. ${segment.source}`;
    content.appendChild(source);

    if (segment.id === state.activeSegmentId) {
      const editBlock = document.createElement("div");
      editBlock.className = "segment-edit-block";

      const label = document.createElement("label");
      label.className = "segment-edit-label";
      label.textContent = `${state.project.meta.targetLanguage || "Target"} Translation`;

      const input = document.createElement("textarea");
      input.className = "segment-translation-input";
      input.placeholder = "Write translation here...";
      input.value = segment.translation || "";
      input.dataset.segmentId = segment.id;

      editBlock.append(label, input);
      content.appendChild(editBlock);
    }

    item.appendChild(content);
    els.segmentList.appendChild(item);
  });

  els.segmentCount.textContent = `${state.project.segments.length} segments`;
}

function renderGlossary() {
  els.glossaryList.innerHTML = "";
  const entries = getRelevantGlossaryEntries();

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.textContent = "No glossary entries yet.";
    els.glossaryList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    const term = document.createElement("strong");
    term.textContent = entry.targetTerm;
    const translation = document.createElement("span");
    translation.textContent = entry.translation;
    item.append(term, translation);
    els.glossaryList.appendChild(item);
  });
}

function applyEditorPosition() {
  els.workspace.classList.toggle("editor-bottom", state.project.meta.editorPosition === "bottom");
  els.workspace.classList.toggle("editor-right", state.project.meta.editorPosition !== "bottom");
}

function stampUpdated() {
  state.project.meta.updatedAt = new Date().toISOString();
  persistProjectToStorage();
}

function persistProjectToStorage() {
  try {
    const payload = {
      project: {
        meta: { ...state.project.meta },
        sourceText: state.project.sourceText,
        segments: state.project.segments.map((segment) => ({
          id: segment.id,
          source: segment.source,
          translation: segment.translation,
        })),
        glossary: state.project.glossary.map((entry) => ({
          targetTerm: entry.targetTerm,
          translation: entry.translation,
          addedAt: entry.addedAt || null,
          updatedAt: entry.updatedAt || null,
        })),
      },
      activeSegmentId: state.activeSegmentId,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not persist project to local storage.", error);
  }
}

function loadProjectFromStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    const storedProject = parsed && parsed.project ? parsed.project : parsed;
    state.project = normalizeProjectData(storedProject, "Untitled Project");

    const preferredSegmentId = parsed && typeof parsed.activeSegmentId === "string"
      ? parsed.activeSegmentId
      : null;
    const hasPreferred = preferredSegmentId
      && state.project.segments.some((segment) => segment.id === preferredSegmentId);
    state.activeSegmentId = hasPreferred ? preferredSegmentId : state.project.segments[0]?.id || null;
  } catch (error) {
    console.warn("Could not load project from local storage. Starting fresh.", error);
  }
}

function normalizeProjectData(parsed, fallbackName = "Untitled Project") {
  if (!parsed || !parsed.meta || !Array.isArray(parsed.segments) || !Array.isArray(parsed.glossary)) {
    throw new Error("Invalid project schema");
  }

  return {
    meta: {
      name: parsed.meta.name || fallbackName,
      sourceLanguage: parsed.meta.sourceLanguage || "",
      targetLanguage: parsed.meta.targetLanguage || "",
      splitMode: parsed.meta.splitMode || "sentence",
      editorPosition: parsed.meta.editorPosition || "right",
      createdAt: parsed.meta.createdAt || new Date().toISOString(),
      updatedAt: parsed.meta.updatedAt || new Date().toISOString(),
    },
    sourceText: parsed.sourceText || rebuildSourceText(parsed.segments, parsed.meta.splitMode),
    segments: parsed.segments.map((segment, index) => ({
      id: segment.id || `seg-${index + 1}`,
      source: segment.source || "",
      translation: segment.translation || "",
      index,
    })),
    glossary: parsed.glossary
      .filter((item) => item && item.targetTerm && item.translation)
      .map((item) => ({
        targetTerm: String(item.targetTerm),
        translation: String(item.translation),
        addedAt: item.addedAt || new Date().toISOString(),
        updatedAt: item.updatedAt || null,
      })),
  };
}

function getSelectedTextInField(field) {
  if (!field || typeof field.selectionStart !== "number" || typeof field.selectionEnd !== "number") {
    return "";
  }

  if (field.selectionStart === field.selectionEnd) {
    return "";
  }

  return field.value.slice(field.selectionStart, field.selectionEnd).trim();
}

function getWordAtCaret(field) {
  if (!field || typeof field.selectionStart !== "number") {
    return "";
  }

  const text = field.value || "";
  if (!text) {
    return "";
  }

  const pos = Math.max(0, Math.min(text.length, field.selectionStart));
  if (pos >= text.length) {
    return "";
  }

  if (!isWordChar(text[pos])) {
    return "";
  }

  let start = pos;
  let end = pos;

  while (start > 0 && isWordChar(text[start - 1])) {
    start -= 1;
  }
  while (end < text.length && isWordChar(text[end])) {
    end += 1;
  }

  return text.slice(start, end).trim();
}

function isWordChar(char) {
  return /[\p{L}\p{N}_'-]/u.test(char);
}

function stripExtension(filename) {
  return filename.replace(/\.[^./\\]+$/, "");
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-") || "adagio-project";
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
