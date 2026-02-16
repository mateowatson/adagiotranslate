const state = {
  project: {
    meta: {
      name: "Untitled Project",
      sourceLanguage: "",
      targetLanguage: "",
      splitMode: "sentence",
      editorPosition: "bottom",
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
  lastFocusedEditable: null,
};
const LOCAL_STORAGE_KEY = "adagioTranslate.currentProject.v1";
const GOOGLE_API_KEY_STORAGE_KEY = "adagioTranslate.googleApiKey.v1";
const DEEPL_API_KEY_STORAGE_KEY = "adagioTranslate.deeplApiKey.v1";
const MYMEMORY_EMAIL_STORAGE_KEY = "adagioTranslate.myMemoryEmail.v1";
const MT_PROVIDER_STORAGE_KEY = "adagioTranslate.mtProvider.v1";
const GOOGLE_TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const DEEPL_TRANSLATE_ENDPOINT = "https://api-free.deepl.com/v2/translate";
const MYMEMORY_TRANSLATE_ENDPOINT = "https://api.mymemory.translated.net/get";
const LANGUAGE_LABELS = {
  ar: "Arabic",
  bn: "Bengali",
  zh: "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  nl: "Dutch",
  en: "English",
  fr: "French",
  de: "German",
  el: "Greek",
  he: "Hebrew",
  hi: "Hindi",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  fa: "Persian",
  pl: "Polish",
  pt: "Portuguese",
  ru: "Russian",
  es: "Spanish",
  sv: "Swedish",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
};

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
  localSettingsBtn: document.getElementById("local-settings-btn"),
  mtProviderSelect: document.getElementById("mt-provider-select"),
  googleApiKeyInput: document.getElementById("google-api-key-input"),
  deeplApiKeyInput: document.getElementById("deepl-api-key-input"),
  myMemoryEmailInput: document.getElementById("mymemory-email-input"),
  saveGoogleKeyBtn: document.getElementById("save-google-key-btn"),
  clearGoogleKeyBtn: document.getElementById("clear-google-key-btn"),
  localSettingsDialog: document.getElementById("local-settings-dialog"),
  localSettingsStatus: document.getElementById("local-settings-status"),
  localSettingsCloseBtn: document.getElementById("local-settings-close-btn"),

  importDocBtn: document.getElementById("import-doc-btn"),
  openProjectBtn: document.getElementById("open-project-btn"),
  saveProjectBtn: document.getElementById("save-project-btn"),
  saveProjectAsBtn: document.getElementById("save-project-as-btn"),
  exportMdBtn: document.getElementById("export-md-btn"),
  exportDocxBtn: document.getElementById("export-docx-btn"),
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
  bindLocalSettings();
  loadProjectFromStorage();
  loadMachineTranslationSettingsFromStorage();
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
  els.exportMdBtn.addEventListener("click", exportTargetAsMarkdown);
  els.exportDocxBtn.addEventListener("click", exportTargetAsDocx);
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
  document.addEventListener("focusin", (event) => {
    if (isEditableField(event.target)) {
      state.lastFocusedEditable = event.target;
    }
  });

  document.querySelectorAll("[data-edit-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.editAction;
      await runEditAction(action);
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

async function runEditAction(action) {
  const target = getEditTarget();
  if (!target || !action) {
    return;
  }

  target.focus();

  if (action === "selectAll") {
    target.select();
    return;
  }

  if (action === "paste") {
    const pasted = await pasteFromClipboard(target);
    if (!pasted) {
      document.execCommand("paste");
    }
    return;
  }

  const executed = document.execCommand(action);
  if (executed) {
    return;
  }

  if (action === "copy") {
    await copySelection(target);
    return;
  }

  if (action === "cut") {
    await cutSelection(target);
  }
}

function getEditTarget() {
  if (isEditableField(document.activeElement)) {
    return document.activeElement;
  }

  if (isEditableField(state.lastFocusedEditable) && state.lastFocusedEditable.isConnected) {
    return state.lastFocusedEditable;
  }

  if (state.activeSegmentId) {
    const activeSegmentField = els.segmentList.querySelector(
      `.segment-translation-input[data-segment-id="${state.activeSegmentId}"]`
    );
    if (isEditableField(activeSegmentField)) {
      return activeSegmentField;
    }
  }

  return null;
}

function isEditableField(node) {
  return node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement;
}

async function pasteFromClipboard(field) {
  if (!navigator.clipboard?.readText) {
    return false;
  }

  try {
    const clipboardText = await navigator.clipboard.readText();
    if (typeof clipboardText !== "string") {
      return false;
    }
    replaceSelection(field, clipboardText, "end");
    return true;
  } catch (error) {
    console.warn("Paste via Clipboard API failed.", error);
    return false;
  }
}

async function copySelection(field) {
  if (!navigator.clipboard?.writeText) {
    return;
  }

  const selected = getSelectedTextInField(field);
  if (!selected) {
    return;
  }

  try {
    await navigator.clipboard.writeText(selected);
  } catch (error) {
    console.warn("Copy via Clipboard API failed.", error);
  }
}

async function cutSelection(field) {
  const selected = getSelectedTextInField(field);
  if (!selected) {
    return;
  }

  await copySelection(field);
  replaceSelection(field, "", "start");
}

function replaceSelection(field, text, selectionMode = "end") {
  const start = field.selectionStart ?? 0;
  const end = field.selectionEnd ?? start;
  field.setRangeText(text, start, end, selectionMode);
  field.dispatchEvent(new Event("input", { bubbles: true }));
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

function bindLocalSettings() {
  els.localSettingsBtn.addEventListener("click", openLocalSettingsDialog);
  els.saveGoogleKeyBtn.addEventListener("click", saveMachineTranslationSettings);
  els.clearGoogleKeyBtn.addEventListener("click", clearMachineTranslationKeys);
  els.localSettingsCloseBtn.addEventListener("click", () => {
    els.localSettingsDialog.close();
  });
}

function bindSegmentEditor() {
  els.segmentList.addEventListener("click", (event) => {
    const segmentItem = event.target.closest(".segment-item");
    const autoTranslateBtn = event.target.closest(".segment-auto-translate-btn");
    if (autoTranslateBtn) {
      event.stopPropagation();
      translateActiveSegment(autoTranslateBtn);
      return;
    }

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
      editorPosition: "bottom",
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
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
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

async function translateActiveSegment(triggerButton = null) {
  const activeSegment = getActiveSegment();
  if (!activeSegment) {
    setMtStatus("Select a segment first.", true);
    return;
  }

  const source = state.project.meta.sourceLanguage;
  const target = state.project.meta.targetLanguage;
  if (!source || !target) {
    setMtStatus("Set source and target languages first.", true);
    return;
  }

  const provider = getMachineTranslationProvider();
  if (!isProviderConfigured(provider)) {
    setMtStatus("Configure machine translation in Local Settings first.", true);
    return;
  }

  if (!activeSegment.source.trim()) {
    setMtStatus("Selected segment has no source text.", true);
    return;
  }

  const buttonEl = triggerButton instanceof HTMLButtonElement ? triggerButton : null;
  const previousButtonText = buttonEl ? buttonEl.textContent : "";
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = "Translating...";
  }
  setMtStatus("Requesting translation...", false);

  try {
    const translatedText = await requestTranslationByProvider({
      provider,
      source,
      target,
      text: activeSegment.source,
    });

    activeSegment.translation = translatedText;
    stampUpdated();
    renderSegments();
    renderGlossary();
    setMtStatus("Segment translated.", false);
  } catch (error) {
    console.error(error);
    setMtStatus(error.message || "Translation failed.", true);
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = previousButtonText;
    }
  }
}

async function requestTranslationByProvider({ provider, source, target, text }) {
  if (provider === "google") {
    return requestGoogleTranslation({
      apiKey: getStoredGoogleApiKey(),
      source,
      target,
      text,
    });
  }

  if (provider === "deepl") {
    return requestDeepLTranslation({
      apiKey: getStoredDeepLApiKey(),
      source,
      target,
      text,
    });
  }

  return requestMyMemoryTranslation({
    source,
    target,
    text,
    email: getStoredMyMemoryEmail(),
  });
}

async function requestGoogleTranslation({ apiKey, source, target, text }) {
  const response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      source,
      target,
      format: "text",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = payload?.error?.message || `Google Translate API request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  const translated = payload?.data?.translations?.[0]?.translatedText;
  if (!translated) {
    throw new Error("Google Translate API returned no translation.");
  }

  return decodeHtmlEntities(translated);
}

async function requestDeepLTranslation({ apiKey, source, target, text }) {
  const sourceLang = mapSourceLanguageForDeepL(source);
  const targetLang = mapTargetLanguageForDeepL(target);
  if (!sourceLang || !targetLang) {
    throw new Error("Selected language pair is not supported by DeepL.");
  }

  const params = new URLSearchParams();
  params.set("text", text);
  params.set("source_lang", sourceLang);
  params.set("target_lang", targetLang);

  const response = await fetch(DEEPL_TRANSLATE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = payload?.message || `DeepL API request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  const translated = payload?.translations?.[0]?.text;
  if (!translated) {
    throw new Error("DeepL API returned no translation.");
  }

  return translated;
}

async function requestMyMemoryTranslation({ source, target, text, email = "" }) {
  const sourceLang = normalizeLangCode(source);
  const targetLang = normalizeLangCode(target);
  const params = new URLSearchParams();
  params.set("q", text);
  params.set("langpair", `${sourceLang}|${targetLang}`);
  if (email.trim()) {
    params.set("de", email.trim());
  }
  const url = `${MYMEMORY_TRANSLATE_ENDPOINT}?${params.toString()}`;

  const response = await fetch(url, { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MyMemory API request failed (${response.status})`);
  }

  const translated = payload?.responseData?.translatedText;
  if (!translated) {
    throw new Error("MyMemory returned no translation.");
  }

  return decodeHtmlEntities(translated);
}

function exportTargetAsMarkdown() {
  const translatedSegments = getTranslatedSegments();
  if (!translatedSegments.length) {
    alert("No translated segments to export yet.");
    return;
  }

  const targetLanguage = getLanguageLabel(state.project.meta.targetLanguage) || state.project.meta.targetLanguage || "Unknown";
  const sourceLanguage = getLanguageLabel(state.project.meta.sourceLanguage) || state.project.meta.sourceLanguage || "Unknown";
  const heading = [
    `# ${state.project.meta.name || "Adagio Translate Export"}`,
    "",
    `- Source language: ${sourceLanguage}`,
    `- Target language: ${targetLanguage}`,
    "",
    "---",
    "",
  ].join("\n");

  const delimiter = state.project.meta.splitMode === "paragraph" ? "\n\n" : "\n";
  const body = translatedSegments.map((segment) => segment.translation.trim()).join(delimiter);
  const markdown = `${heading}${body}\n`;

  downloadTextFile(
    `${sanitizeFilename(state.project.meta.name || "adagio-project")}-target.md`,
    markdown,
    "text/markdown"
  );
}

async function exportTargetAsDocx() {
  const translatedSegments = getTranslatedSegments();
  if (!translatedSegments.length) {
    alert("No translated segments to export yet.");
    return;
  }

  if (!window.docx) {
    alert("DOCX export library is not available. Reload and try again.");
    return;
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
  const projectTitle = state.project.meta.name || "Adagio Translate Export";
  const sourceLanguage = getLanguageLabel(state.project.meta.sourceLanguage) || state.project.meta.sourceLanguage || "Unknown";
  const targetLanguage = getLanguageLabel(state.project.meta.targetLanguage) || state.project.meta.targetLanguage || "Unknown";

  const paragraphs = [
    new Paragraph({
      children: [new TextRun({ text: projectTitle, bold: true, size: 30 })],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Source: ${sourceLanguage}  Target: ${targetLanguage}`, italics: true })],
      spacing: { after: 240 },
    }),
  ];

  translatedSegments.forEach((segment, index) => {
    const segmentParagraphs = markdownToDocxParagraphs(segment.translation, Paragraph, TextRun, HeadingLevel);
    paragraphs.push(...segmentParagraphs);

    if (state.project.meta.splitMode === "paragraph" && index < translatedSegments.length - 1) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }));
    }
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "adagio-ul",
          levels: [
            {
              level: 0,
              format: "bullet",
              text: "•",
              alignment: "left",
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 260 },
                },
              },
            },
          ],
        },
        {
          reference: "adagio-ol",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left",
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 260 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  try {
    const blob = await Packer.toBlob(doc);
    downloadBlob(`${sanitizeFilename(state.project.meta.name || "adagio-project")}-target.docx`, blob);
  } catch (error) {
    console.error(error);
    alert("Could not export DOCX.");
  }
}

function getTranslatedSegments() {
  return state.project.segments.filter((segment) => (segment.translation || "").trim());
}

function markdownToDocxParagraphs(markdown, Paragraph, TextRun, HeadingLevel) {
  const lines = String(markdown || "").split(/\r?\n/);
  const paragraphs = [];

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }));
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingMap = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      paragraphs.push(
        new Paragraph({
          heading: headingMap[Math.min(level, 6)] || HeadingLevel.HEADING_1,
          children: markdownInlineToTextRuns(headingMatch[2], TextRun),
          spacing: { after: 160 },
        })
      );
      return;
    }

    const ulMatch = line.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      paragraphs.push(
        new Paragraph({
          children: markdownInlineToTextRuns(ulMatch[1], TextRun),
          numbering: { reference: "adagio-ul", level: 0 },
          spacing: { after: 80 },
        })
      );
      return;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      paragraphs.push(
        new Paragraph({
          children: markdownInlineToTextRuns(olMatch[1], TextRun),
          numbering: { reference: "adagio-ol", level: 0 },
          spacing: { after: 80 },
        })
      );
      return;
    }

    paragraphs.push(
      new Paragraph({
        children: markdownInlineToTextRuns(line, TextRun),
        spacing: { after: 120 },
      })
    );
  });

  return paragraphs;
}

function markdownInlineToTextRuns(text, TextRun) {
  const tokens = tokenizeMarkdownInline(String(text || ""));
  return tokens.map((token) =>
    new TextRun({
      text: token.text,
      bold: token.bold || false,
      italics: token.italics || false,
      strike: token.strike || false,
    })
  );
}

function tokenizeMarkdownInline(input) {
  const tokens = [];
  let i = 0;
  let bold = false;
  let italics = false;
  let strike = false;
  let buffer = "";

  const flush = () => {
    if (!buffer) {
      return;
    }
    tokens.push({ text: buffer, bold, italics, strike });
    buffer = "";
  };

  while (i < input.length) {
    const nextTwo = input.slice(i, i + 2);

    if (nextTwo === "**" || nextTwo === "__") {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }

    if (nextTwo === "~~") {
      flush();
      strike = !strike;
      i += 2;
      continue;
    }

    const char = input[i];
    if (char === "*" || char === "_") {
      flush();
      italics = !italics;
      i += 1;
      continue;
    }

    if (char === "\\" && i + 1 < input.length) {
      buffer += input[i + 1];
      i += 2;
      continue;
    }

    buffer += char;
    i += 1;
  }

  flush();
  return tokens.length ? tokens : [{ text: input, bold: false, italics: false, strike: false }];
}

function saveMachineTranslationSettings() {
  const provider = (els.mtProviderSelect.value || "google").trim();
  const googleKey = (els.googleApiKeyInput.value || "").trim();
  const deeplKey = (els.deeplApiKeyInput.value || "").trim();
  const myMemoryEmail = (els.myMemoryEmailInput.value || "").trim();
  try {
    localStorage.setItem(MT_PROVIDER_STORAGE_KEY, provider);
    if (googleKey) {
      localStorage.setItem(GOOGLE_API_KEY_STORAGE_KEY, googleKey);
    }
    if (deeplKey) {
      localStorage.setItem(DEEPL_API_KEY_STORAGE_KEY, deeplKey);
    }
    if (myMemoryEmail) {
      localStorage.setItem(MYMEMORY_EMAIL_STORAGE_KEY, myMemoryEmail);
    } else {
      localStorage.removeItem(MYMEMORY_EMAIL_STORAGE_KEY);
    }
    setMtStatus("Local machine translation settings saved.", false);
    renderSegments();
  } catch (error) {
    console.error(error);
    setMtStatus("Could not save local settings.", true);
  }
}

function clearMachineTranslationKeys() {
  try {
    localStorage.removeItem(GOOGLE_API_KEY_STORAGE_KEY);
    localStorage.removeItem(DEEPL_API_KEY_STORAGE_KEY);
    localStorage.removeItem(MYMEMORY_EMAIL_STORAGE_KEY);
    els.googleApiKeyInput.value = "";
    els.deeplApiKeyInput.value = "";
    els.myMemoryEmailInput.value = "";
    setMtStatus("Saved API keys cleared.", false);
    renderSegments();
  } catch (error) {
    console.error(error);
    setMtStatus("Could not clear API keys.", true);
  }
}

function loadMachineTranslationSettingsFromStorage() {
  try {
    els.mtProviderSelect.value = getMachineTranslationProvider();
    els.googleApiKeyInput.value = getStoredGoogleApiKey();
    els.deeplApiKeyInput.value = getStoredDeepLApiKey();
    els.myMemoryEmailInput.value = getStoredMyMemoryEmail();
    setMtStatus("Local machine translation settings loaded.", false);
  } catch (error) {
    console.error(error);
    setMtStatus("Could not read local settings.", true);
  }
}

function setMtStatus(message, isError) {
  els.localSettingsStatus.textContent = message;
  els.localSettingsStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
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
  const sourceLabel = getLanguageLabel(sourceLanguage);
  const targetLabel = getLanguageLabel(targetLanguage);
  const langText = sourceLanguage && targetLanguage ? `${sourceLabel} -> ${targetLabel}` : "No languages set";
  els.projectMeta.textContent = `${name} | ${langText}`;

  els.splitMode.value = state.project.meta.splitMode || "sentence";
  els.editorPosition.value = state.project.meta.editorPosition || "bottom";
}

function renderSegments() {
  els.segmentList.innerHTML = "";
  const hasMachineTranslation = isProviderConfigured(getMachineTranslationProvider());

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

      const editActions = document.createElement("div");
      editActions.className = "segment-edit-actions";

      const label = document.createElement("label");
      label.className = "segment-edit-label";
      label.textContent = `${getLanguageLabel(state.project.meta.targetLanguage) || "Target"} Translation`;
      editActions.appendChild(label);

      if (hasMachineTranslation) {
        const autoTranslateBtn = document.createElement("button");
        autoTranslateBtn.type = "button";
        autoTranslateBtn.className = "segment-auto-translate-btn";
        autoTranslateBtn.textContent = "Auto-Translate Segment";
        editActions.appendChild(autoTranslateBtn);
      }

      const input = document.createElement("textarea");
      input.className = "segment-translation-input";
      input.placeholder = "Write translation here...";
      input.value = segment.translation || "";
      input.dataset.segmentId = segment.id;

      editBlock.append(editActions, input);
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
      editorPosition: parsed.meta.editorPosition || "bottom",
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

function getLanguageLabel(code) {
  if (!code) {
    return "";
  }
  return LANGUAGE_LABELS[code] || code;
}

function openLocalSettingsDialog() {
  els.mtProviderSelect.value = getMachineTranslationProvider();
  els.googleApiKeyInput.value = getStoredGoogleApiKey();
  els.deeplApiKeyInput.value = getStoredDeepLApiKey();
  els.myMemoryEmailInput.value = getStoredMyMemoryEmail();
  setMtStatus("These settings are local to this browser.", false);
  els.localSettingsDialog.showModal();
}

function getStoredGoogleApiKey() {
  try {
    return (localStorage.getItem(GOOGLE_API_KEY_STORAGE_KEY) || "").trim();
  } catch (error) {
    console.error(error);
    return "";
  }
}

function getStoredDeepLApiKey() {
  try {
    return (localStorage.getItem(DEEPL_API_KEY_STORAGE_KEY) || "").trim();
  } catch (error) {
    console.error(error);
    return "";
  }
}

function getStoredMyMemoryEmail() {
  try {
    return (localStorage.getItem(MYMEMORY_EMAIL_STORAGE_KEY) || "").trim();
  } catch (error) {
    console.error(error);
    return "";
  }
}

function getMachineTranslationProvider() {
  try {
    const stored = (localStorage.getItem(MT_PROVIDER_STORAGE_KEY) || "").trim().toLowerCase();
    if (stored === "google" || stored === "deepl" || stored === "mymemory") {
      return stored;
    }
    return "google";
  } catch (error) {
    console.error(error);
    return "google";
  }
}

function isProviderConfigured(provider) {
  if (provider === "google") {
    return Boolean(getStoredGoogleApiKey());
  }
  if (provider === "deepl") {
    return Boolean(getStoredDeepLApiKey());
  }
  return provider === "mymemory";
}

function normalizeLangCode(code) {
  return String(code || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
}

function mapSourceLanguageForDeepL(code) {
  const normalized = normalizeLangCode(code);
  const map = {
    ar: "AR",
    bg: "BG",
    cs: "CS",
    da: "DA",
    de: "DE",
    el: "EL",
    en: "EN",
    es: "ES",
    et: "ET",
    fi: "FI",
    fr: "FR",
    hu: "HU",
    id: "ID",
    it: "IT",
    ja: "JA",
    ko: "KO",
    lt: "LT",
    lv: "LV",
    nb: "NB",
    nl: "NL",
    pl: "PL",
    pt: "PT",
    ro: "RO",
    ru: "RU",
    sk: "SK",
    sl: "SL",
    sv: "SV",
    tr: "TR",
    uk: "UK",
    zh: "ZH",
  };
  return map[normalized] || "";
}

function mapTargetLanguageForDeepL(code) {
  const normalized = normalizeLangCode(code);
  const map = {
    ar: "AR",
    bg: "BG",
    cs: "CS",
    da: "DA",
    de: "DE",
    el: "EL",
    en: "EN",
    es: "ES",
    et: "ET",
    fi: "FI",
    fr: "FR",
    hu: "HU",
    id: "ID",
    it: "IT",
    ja: "JA",
    ko: "KO",
    lt: "LT",
    lv: "LV",
    nb: "NB",
    nl: "NL",
    pl: "PL",
    pt: "PT",
    ro: "RO",
    ru: "RU",
    sk: "SK",
    sl: "SL",
    sv: "SV",
    tr: "TR",
    uk: "UK",
    zh: "ZH",
  };
  return map[normalized] || "";
}

function decodeHtmlEntities(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  return doc.documentElement.textContent || "";
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
