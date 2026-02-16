const state = {
  project: {
    meta: {
      name: "",
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
  uiLanguage: "en",
};
const LOCAL_STORAGE_KEY = "adagioTranslate.currentProject.v1";
const ONBOARDING_STATUS_STORAGE_KEY = "adagioTranslate.onboardingStatus.v1";
const UI_LANGUAGE_STORAGE_KEY = "adagioTranslate.uiLanguage.v1";
const GOOGLE_API_KEY_STORAGE_KEY = "adagioTranslate.googleApiKey.v1";
const MYMEMORY_EMAIL_STORAGE_KEY = "adagioTranslate.myMemoryEmail.v1";
const MT_PROVIDER_STORAGE_KEY = "adagioTranslate.mtProvider.v1";
const GOOGLE_TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const MYMEMORY_TRANSLATE_ENDPOINT = "https://api.mymemory.translated.net/get";
const ONBOARDING_STEPS = [
  {
    id: "file_menu",
    title: "File Actions",
    body: "Use File to import documents, open/save projects, and export finished translations.",
    targets: ["#menu-file > summary", "#menu-file"],
  },
  {
    id: "segments",
    title: "Segments",
    body: "Your document is split into segments here. Click any segment to work on it.",
    targets: [".segments-panel", "#segment-list"],
  },
  {
    id: "translation",
    title: "Inline Translation",
    body: "After selecting a segment, the target text area appears inline so you can translate directly.",
    targets: [".segment-translation-input", "#segment-list"],
    onBeforeShow: () => {
      if (!state.activeSegmentId && state.project.segments.length) {
        selectSegment(state.project.segments[0].id);
      }
    },
  },
  {
    id: "auto_translate",
    title: "Auto-Translate",
    body: "If machine translation is configured, this button appears next to the selected segment.",
    targets: [".segment-auto-translate-btn", "#local-settings-btn"],
  },
  {
    id: "glossary",
    title: "Glossary",
    body: "Add term translations here to keep wording consistent across the project.",
    targets: [".segment-inline-glossary", ".segment-add-glossary-btn", "#add-glossary-btn", ".glossary-panel"],
    onBeforeShow: () => {
      if (!state.activeSegmentId && state.project.segments.length) {
        selectSegment(state.project.segments[0].id);
      }
    },
  },
  {
    id: "local_settings",
    title: "Local Settings",
    body: "Choose translation provider and optional credentials here. These settings stay local and are not saved in project JSON exports.",
    targets: ["#local-settings-btn"],
  },
];
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
const LANGUAGE_LABELS_ES = {
  ar: "Árabe",
  bn: "Bengalí",
  zh: "Chino (simplificado)",
  "zh-TW": "Chino (tradicional)",
  nl: "Neerlandés",
  en: "Inglés",
  fr: "Francés",
  de: "Alemán",
  el: "Griego",
  he: "Hebreo",
  hi: "Hindi",
  id: "Indonesio",
  it: "Italiano",
  ja: "Japonés",
  ko: "Coreano",
  fa: "Persa",
  pl: "Polaco",
  pt: "Portugués",
  ru: "Ruso",
  es: "Español",
  sv: "Sueco",
  th: "Tailandés",
  tr: "Turco",
  uk: "Ucraniano",
  ur: "Urdu",
  vi: "Vietnamita",
};
const UI_TEXT = {
  en: {
    app_title: "Adagio Translate",
    menu_file: "File",
    menu_edit: "Edit",
    menu_view: "View",
    local_settings: "Local Settings",
    new_project: "New Project",
    import_document: "Import Document",
    open_project: "Open Project",
    save_project: "Save Project",
    save_project_as: "Save Project As",
    export_md: "Export Target as Markdown",
    export_docx: "Export Target as DOCX",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    select_all: "Select All",
    split_mode: "Split Mode",
    editor_position: "Editor Position",
    sentence: "Sentence",
    paragraph: "Paragraph",
    bottom: "Bottom",
    right: "Right",
    segments: "Segments",
    resegment: "Re-Segment",
    segments_help: "Click a segment to edit its translation inline.",
    segment_count: "{count} segments",
    glossary: "Glossary",
    add_entry: "Add Entry",
    glossary_help: "Relevant entries for selected segment appear here.",
    glossary_no_entries: "No glossary entries yet.",
    glossary_no_matches: "No glossary matches for this segment.",
    glossary_summary_prefix: "Glossary",
    view_all_glossary_matches: "View all glossary matches",
    project_setup: "Project Setup",
    source_language: "Source Language",
    target_language: "Target Language",
    select_source_language: "Select source language",
    select_target_language: "Select target language",
    split_method: "Split Method",
    cancel: "Cancel",
    continue: "Continue",
    add_glossary_entry: "Add Glossary Entry",
    target_term: "Target Term",
    translation_meaning: "Translation / Meaning",
    add: "Add",
    close: "Close",
    glossary_matches: "Glossary Matches",
    local_settings_title: "Local Settings",
    local_settings_note:
      "Machine translation settings and API keys are stored only in this browser and are not included in exported project JSON files.",
    app_language: "App Language",
    translation_provider: "Translation Provider",
    provider_none: "None",
    provider_mymemory: "MyMemory (No account)",
    provider_google: "Google Translate (API key)",
    google_api_key: "Google Cloud API Key",
    mymemory_email: "MyMemory Email (optional)",
    clear_keys: "Clear Keys",
    save_settings: "Save Settings",
    untitled_project: "Untitled Project",
    no_languages_set: "No languages set",
    target_translation: "Translation",
    write_translation_here: "Write translation here...",
    status_pending: "pending",
    status_translated: "translated",
    status_prefix: "Status",
    auto_translate_segment: "Auto-Translate Segment",
    translating: "Translating...",
    select_segment_first: "Select a segment first.",
    set_languages_first: "Set source and target languages first.",
    configure_mt_first: "Configure machine translation in Local Settings first.",
    selected_segment_no_source: "Selected segment has no source text.",
    requesting_translation: "Requesting translation...",
    segment_translated: "Segment translated.",
    translation_failed: "Translation failed.",
    no_translated_segments: "No translated segments to export yet.",
    docx_export_unavailable: "DOCX export library is not available. Reload and try again.",
    could_not_export_docx: "Could not export DOCX.",
    project_saved: "Project saved.",
    could_not_save_picker_fallback: "Could not save via File System Access API. Downloading instead.",
    could_not_open_picker_fallback: "Could not open file picker. Falling back to standard upload.",
    invalid_project_file: "The selected project file is invalid.",
    empty_document_file: "The selected file has no readable text content.",
    start_new_project_confirm: "Start a new project? Unsaved changes in the current project will be lost.",
    local_settings_loaded: "Local machine translation settings loaded.",
    local_settings_saved: "Local settings saved.",
    local_settings_save_failed: "Could not save local settings.",
    api_keys_cleared: "Saved API keys cleared.",
    api_keys_clear_failed: "Could not clear API keys.",
    local_settings_read_failed: "Could not read local settings.",
    local_settings_local_notice: "These settings are local to this browser.",
    onboarding_header: "Quick Tour",
    onboarding_step_counter: "Step {current} of {total}",
    onboarding_back: "Back",
    onboarding_next: "Next",
    onboarding_finish: "Finish",
    onboarding_skip: "Skip",
  },
  es: {
    app_title: "Adagio Translate",
    menu_file: "Archivo",
    menu_edit: "Editar",
    menu_view: "Ver",
    local_settings: "Configuración local",
    new_project: "Nuevo proyecto",
    import_document: "Importar documento",
    open_project: "Abrir proyecto",
    save_project: "Guardar proyecto",
    save_project_as: "Guardar proyecto como",
    export_md: "Exportar destino como Markdown",
    export_docx: "Exportar destino como DOCX",
    undo: "Deshacer",
    redo: "Rehacer",
    cut: "Cortar",
    copy: "Copiar",
    paste: "Pegar",
    select_all: "Seleccionar todo",
    split_mode: "Modo de segmentación",
    editor_position: "Posición del editor",
    sentence: "Oración",
    paragraph: "Párrafo",
    bottom: "Abajo",
    right: "Derecha",
    segments: "Segmentos",
    resegment: "Volver a segmentar",
    segments_help: "Haz clic en un segmento para editar su traducción en línea.",
    segment_count: "{count} segmentos",
    glossary: "Glosario",
    add_entry: "Agregar entrada",
    glossary_help: "Aquí aparecen las entradas relevantes para el segmento seleccionado.",
    glossary_no_entries: "Aún no hay entradas en el glosario.",
    glossary_no_matches: "No hay coincidencias de glosario para este segmento.",
    glossary_summary_prefix: "Glosario",
    view_all_glossary_matches: "Ver todas las coincidencias del glosario",
    project_setup: "Configuración del proyecto",
    source_language: "Idioma de origen",
    target_language: "Idioma de destino",
    select_source_language: "Selecciona idioma de origen",
    select_target_language: "Selecciona idioma de destino",
    split_method: "Método de segmentación",
    cancel: "Cancelar",
    continue: "Continuar",
    add_glossary_entry: "Agregar entrada al glosario",
    target_term: "Término objetivo",
    translation_meaning: "Traducción / Significado",
    add: "Agregar",
    close: "Cerrar",
    glossary_matches: "Coincidencias del glosario",
    local_settings_title: "Configuración local",
    local_settings_note:
      "La configuración de traducción automática y las claves API se guardan solo en este navegador y no se incluyen en los archivos JSON exportados.",
    app_language: "Idioma de la aplicación",
    translation_provider: "Proveedor de traducción",
    provider_none: "Ninguno",
    provider_mymemory: "MyMemory (sin cuenta)",
    provider_google: "Google Translate (clave API)",
    google_api_key: "Clave API de Google Cloud",
    mymemory_email: "Correo de MyMemory (opcional)",
    clear_keys: "Borrar claves",
    save_settings: "Guardar configuración",
    untitled_project: "Proyecto sin título",
    no_languages_set: "Idiomas no configurados",
    target_translation: "Traducción",
    write_translation_here: "Escribe la traducción aquí...",
    status_pending: "pendiente",
    status_translated: "traducido",
    status_prefix: "Estado",
    auto_translate_segment: "Traducir segmento automáticamente",
    translating: "Traduciendo...",
    select_segment_first: "Primero selecciona un segmento.",
    set_languages_first: "Primero configura idioma de origen y destino.",
    configure_mt_first: "Configura traducción automática en Configuración local primero.",
    selected_segment_no_source: "El segmento seleccionado no tiene texto de origen.",
    requesting_translation: "Solicitando traducción...",
    segment_translated: "Segmento traducido.",
    translation_failed: "La traducción falló.",
    no_translated_segments: "Aún no hay segmentos traducidos para exportar.",
    docx_export_unavailable: "La librería de exportación DOCX no está disponible. Recarga e inténtalo de nuevo.",
    could_not_export_docx: "No se pudo exportar DOCX.",
    project_saved: "Proyecto guardado.",
    could_not_save_picker_fallback: "No se pudo guardar con File System Access API. Se descargará el archivo.",
    could_not_open_picker_fallback: "No se pudo abrir el selector de archivos. Se usará la carga estándar.",
    invalid_project_file: "El archivo de proyecto seleccionado no es válido.",
    empty_document_file: "El archivo seleccionado no tiene contenido de texto legible.",
    start_new_project_confirm:
      "¿Iniciar un nuevo proyecto? Se perderán los cambios no guardados del proyecto actual.",
    local_settings_loaded: "Configuración local de traducción automática cargada.",
    local_settings_saved: "Configuración local guardada.",
    local_settings_save_failed: "No se pudo guardar la configuración local.",
    api_keys_cleared: "Se borraron las claves guardadas.",
    api_keys_clear_failed: "No se pudieron borrar las claves.",
    local_settings_read_failed: "No se pudo leer la configuración local.",
    local_settings_local_notice: "Esta configuración se guarda localmente en este navegador.",
    onboarding_header: "Guía rápida",
    onboarding_step_counter: "Paso {current} de {total}",
    onboarding_back: "Atrás",
    onboarding_next: "Siguiente",
    onboarding_finish: "Finalizar",
    onboarding_skip: "Omitir",
  },
};
const ONBOARDING_COPY = {
  en: {
    file_menu: { title: "File Actions", body: "Use File to import documents, open/save projects, and export finished translations." },
    segments: { title: "Segments", body: "Your document is split into segments here. Click any segment to work on it." },
    translation: { title: "Inline Translation", body: "After selecting a segment, the target text area appears inline so you can translate directly." },
    auto_translate: { title: "Auto-Translate", body: "If machine translation is configured, this button appears next to the selected segment." },
    glossary: { title: "Glossary", body: "Add term translations here to keep wording consistent across the project." },
    local_settings: { title: "Local Settings", body: "Choose translation provider and optional credentials here. These settings stay local and are not saved in project JSON exports." },
  },
  es: {
    file_menu: { title: "Acciones de archivo", body: "Usa Archivo para importar documentos, abrir/guardar proyectos y exportar traducciones terminadas." },
    segments: { title: "Segmentos", body: "Aquí se divide tu documento en segmentos. Haz clic en cualquier segmento para trabajar en él." },
    translation: { title: "Traducción en línea", body: "Después de seleccionar un segmento, el área de texto de destino aparece en línea para traducir directamente." },
    auto_translate: { title: "Traducción automática", body: "Si la traducción automática está configurada, este botón aparece junto al segmento seleccionado." },
    glossary: { title: "Glosario", body: "Agrega traducciones de términos aquí para mantener consistencia en todo el proyecto." },
    local_settings: { title: "Configuración local", body: "Elige proveedor de traducción y credenciales opcionales aquí. Esta configuración es local y no se guarda en JSON exportado." },
  },
};

const els = {
  workspace: document.getElementById("workspace"),
  projectMeta: document.getElementById("project-meta"),
  brandText: document.querySelector(".brand-text"),
  splitMode: document.getElementById("split-mode"),
  editorPosition: document.getElementById("editor-position"),
  segmentList: document.getElementById("segment-list"),
  segmentCount: document.getElementById("segment-count"),
  resegmentBtn: document.getElementById("resegment-btn"),
  segmentsTitle: document.getElementById("segments-title"),
  segmentsHelpNote: document.getElementById("segments-help-note"),

  glossaryTitle: document.getElementById("glossary-title"),
  glossaryList: document.getElementById("glossary-list"),
  addGlossaryBtn: document.getElementById("add-glossary-btn"),
  glossaryHelpNote: document.getElementById("glossary-help-note"),
  localSettingsBtn: document.getElementById("local-settings-btn"),
  appUiLanguageSelect: document.getElementById("app-ui-language-select"),
  mtProviderSelect: document.getElementById("mt-provider-select"),
  googleApiKeyInput: document.getElementById("google-api-key-input"),
  myMemoryEmailInput: document.getElementById("mymemory-email-input"),
  saveGoogleKeyBtn: document.getElementById("save-google-key-btn"),
  clearGoogleKeyBtn: document.getElementById("clear-google-key-btn"),
  localSettingsDialog: document.getElementById("local-settings-dialog"),
  localSettingsTitle: document.getElementById("local-settings-title"),
  localSettingsNote: document.getElementById("local-settings-note"),
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
  projectSetupTitle: document.getElementById("project-setup-title"),
  sourceLanguageInput: document.getElementById("source-language"),
  targetLanguageInput: document.getElementById("target-language"),
  setupSplitMode: document.getElementById("setup-split-mode"),
  setupCancelBtn: document.getElementById("setup-cancel-btn"),

  glossaryDialog: document.getElementById("glossary-dialog"),
  glossaryForm: document.getElementById("glossary-form"),
  glossaryDialogTitle: document.getElementById("glossary-dialog-title"),
  glossaryTargetTerm: document.getElementById("glossary-target-term"),
  glossaryTranslation: document.getElementById("glossary-translation"),
  glossaryCancelBtn: document.getElementById("glossary-cancel-btn"),
  glossaryMatchesDialog: document.getElementById("glossary-matches-dialog"),
  glossaryMatchesTitle: document.getElementById("glossary-matches-title"),
  glossaryMatchesList: document.getElementById("glossary-matches-list"),
  glossaryMatchesCloseBtn: document.getElementById("glossary-matches-close-btn"),
};

let pendingGlossarySelection = "";
const onboarding = {
  active: false,
  stepIndex: 0,
  overlayEl: null,
  popoverEl: null,
  targetEl: null,
  demoLoaded: false,
  snapshot: null,
};

init();

function init() {
  state.uiLanguage = resolvePreferredUiLanguage();
  bindMenuBehavior();
  bindProjectActions();
  bindEditActions();
  bindDialogs();
  bindSegmentEditor();
  bindLocalSettings();
  bindResponsiveLayout();
  loadProjectFromStorage();
  loadMachineTranslationSettingsFromStorage();
  applyUiLanguage();
  renderAll();
  initOnboarding();
}

function resolvePreferredUiLanguage() {
  try {
    const stored = (localStorage.getItem(UI_LANGUAGE_STORAGE_KEY) || "").trim().toLowerCase();
    if (stored === "en" || stored === "es") {
      return stored;
    }
  } catch (error) {
    console.error(error);
  }

  const browserLangs = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ""];
  const first = String(browserLangs[0] || "").toLowerCase();
  return first.startsWith("es") ? "es" : "en";
}

function t(key, vars = {}) {
  const lang = state.uiLanguage === "es" ? "es" : "en";
  const table = UI_TEXT[lang] || UI_TEXT.en;
  const fallback = UI_TEXT.en[key] || key;
  const template = table[key] || fallback;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

function setLeadingLabelText(controlEl, text) {
  if (!controlEl) {
    return;
  }
  const label = controlEl.closest("label");
  if (!label) {
    return;
  }
  const firstTextNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (firstTextNode) {
    firstTextNode.textContent = `${text}\n`;
  } else {
    label.prepend(document.createTextNode(`${text}\n`));
  }
}

function applyUiLanguage() {
  const lang = state.uiLanguage === "es" ? "es" : "en";
  document.documentElement.lang = lang;

  if (els.brandText) {
    els.brandText.textContent = t("app_title");
  }

  const fileSummary = document.querySelector("#menu-file > summary");
  const editSummary = document.querySelector("#menu-edit > summary");
  const viewSummary = document.querySelector("#menu-view > summary");
  if (fileSummary) fileSummary.textContent = t("menu_file");
  if (editSummary) editSummary.textContent = t("menu_edit");
  if (viewSummary) viewSummary.textContent = t("menu_view");

  els.localSettingsBtn.textContent = t("local_settings");
  els.newProjectBtn.textContent = t("new_project");
  els.importDocBtn.textContent = t("import_document");
  els.openProjectBtn.textContent = t("open_project");
  els.saveProjectBtn.textContent = t("save_project");
  els.saveProjectAsBtn.textContent = t("save_project_as");
  els.exportMdBtn.textContent = t("export_md");
  els.exportDocxBtn.textContent = t("export_docx");
  els.resegmentBtn.textContent = t("resegment");
  els.segmentsTitle.textContent = t("segments");
  els.segmentsHelpNote.textContent = t("segments_help");
  els.glossaryTitle.textContent = t("glossary");
  els.addGlossaryBtn.textContent = t("add_entry");
  els.glossaryHelpNote.textContent = t("glossary_help");

  const editButtons = document.querySelectorAll("[data-edit-action]");
  editButtons.forEach((btn) => {
    const action = btn.getAttribute("data-edit-action");
    if (action === "undo") btn.textContent = t("undo");
    if (action === "redo") btn.textContent = t("redo");
    if (action === "cut") btn.textContent = t("cut");
    if (action === "copy") btn.textContent = t("copy");
    if (action === "paste") btn.textContent = t("paste");
    if (action === "selectAll") btn.textContent = t("select_all");
  });

  const viewLabelSpans = document.querySelectorAll("#menu-view .menu-items label > span");
  if (viewLabelSpans[0]) viewLabelSpans[0].textContent = t("split_mode");
  if (viewLabelSpans[1]) viewLabelSpans[1].textContent = t("editor_position");

  if (els.splitMode.options[0]) els.splitMode.options[0].text = t("sentence");
  if (els.splitMode.options[1]) els.splitMode.options[1].text = t("paragraph");
  if (els.editorPosition.options[0]) els.editorPosition.options[0].text = t("bottom");
  if (els.editorPosition.options[1]) els.editorPosition.options[1].text = t("right");
  if (els.setupSplitMode.options[0]) els.setupSplitMode.options[0].text = t("sentence");
  if (els.setupSplitMode.options[1]) els.setupSplitMode.options[1].text = t("paragraph");

  els.projectSetupTitle.textContent = t("project_setup");
  setLeadingLabelText(els.sourceLanguageInput, t("source_language"));
  setLeadingLabelText(els.targetLanguageInput, t("target_language"));
  setLeadingLabelText(els.setupSplitMode, t("split_method"));
  localizeProjectLanguageSelect(els.sourceLanguageInput, t("select_source_language"));
  localizeProjectLanguageSelect(els.targetLanguageInput, t("select_target_language"));
  els.setupCancelBtn.textContent = t("cancel");
  const setupSubmit = els.projectSetupForm.querySelector('button[type="submit"]');
  if (setupSubmit) setupSubmit.textContent = t("continue");

  els.glossaryDialogTitle.textContent = t("add_glossary_entry");
  setLeadingLabelText(els.glossaryTargetTerm, t("target_term"));
  setLeadingLabelText(els.glossaryTranslation, t("translation_meaning"));
  els.glossaryCancelBtn.textContent = t("cancel");
  const glossarySubmit = els.glossaryForm.querySelector('button[type="submit"]');
  if (glossarySubmit) glossarySubmit.textContent = t("add");

  els.glossaryMatchesTitle.textContent = t("glossary_matches");
  els.glossaryMatchesCloseBtn.textContent = t("close");

  els.localSettingsTitle.textContent = t("local_settings_title");
  els.localSettingsNote.textContent = t("local_settings_note");
  setLeadingLabelText(els.appUiLanguageSelect, t("app_language"));
  setLeadingLabelText(els.mtProviderSelect, t("translation_provider"));
  setLeadingLabelText(els.googleApiKeyInput, t("google_api_key"));
  setLeadingLabelText(els.myMemoryEmailInput, t("mymemory_email"));
  if (els.mtProviderSelect.options[0]) els.mtProviderSelect.options[0].text = t("provider_none");
  if (els.mtProviderSelect.options[1]) els.mtProviderSelect.options[1].text = t("provider_mymemory");
  if (els.mtProviderSelect.options[2]) els.mtProviderSelect.options[2].text = t("provider_google");
  if (els.appUiLanguageSelect.options[0]) els.appUiLanguageSelect.options[0].text = "English";
  if (els.appUiLanguageSelect.options[1]) els.appUiLanguageSelect.options[1].text = "Español";
  els.localSettingsCloseBtn.textContent = t("close");
  els.clearGoogleKeyBtn.textContent = t("clear_keys");
  els.saveGoogleKeyBtn.textContent = t("save_settings");

  if (onboarding.active) {
    showOnboardingStep(onboarding.stepIndex);
  }
}

function localizeProjectLanguageSelect(selectEl, placeholderText) {
  if (!selectEl) {
    return;
  }

  const currentValue = selectEl.value;
  const locale = state.uiLanguage === "es" ? "es" : "en";
  const collator = new Intl.Collator(locale, { sensitivity: "base" });

  const options = Array.from(selectEl.options || []);
  let placeholderOption = null;
  const valueOptions = [];

  options.forEach((option) => {
    const value = String(option.value || "").trim();
    if (!value) {
      option.text = placeholderText;
      placeholderOption = option;
      return;
    }

    option.text = getLanguageLabel(value) || option.text || value;
    valueOptions.push(option);
  });

  valueOptions.sort((a, b) => collator.compare(a.text, b.text));

  selectEl.innerHTML = "";
  if (placeholderOption) {
    selectEl.appendChild(placeholderOption);
  }
  valueOptions.forEach((option) => selectEl.appendChild(option));
  selectEl.value = currentValue;
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

function initOnboarding() {
  if (!shouldRunOnboarding()) {
    return;
  }
  startOnboarding();
  window.addEventListener("resize", refreshOnboardingPosition);
  window.addEventListener("scroll", refreshOnboardingPosition, true);
}

function shouldRunOnboarding() {
  const status = getOnboardingStatus();
  return status !== "completed" && status !== "skipped";
}

function getOnboardingStatus() {
  try {
    return (localStorage.getItem(ONBOARDING_STATUS_STORAGE_KEY) || "").trim().toLowerCase();
  } catch (error) {
    console.error(error);
    return "";
  }
}

function setOnboardingStatus(status) {
  try {
    localStorage.setItem(ONBOARDING_STATUS_STORAGE_KEY, status);
  } catch (error) {
    console.error(error);
  }
}

function startOnboarding() {
  if (onboarding.active) {
    return;
  }

  onboarding.active = true;
  onboarding.stepIndex = 0;
  setupOnboardingDemoProject();
  createOnboardingUi();
  showOnboardingStep(0);
}

function createOnboardingUi() {
  const overlay = document.createElement("div");
  overlay.className = "onboarding-overlay";

  const popover = document.createElement("div");
  popover.className = "onboarding-popover";
  popover.innerHTML = `
    <div class="onboarding-header"></div>
    <div class="onboarding-step"></div>
    <h4 class="onboarding-title"></h4>
    <p class="onboarding-body"></p>
    <div class="onboarding-actions">
      <button type="button" data-onboarding-action="back"></button>
      <button type="button" data-onboarding-action="next"></button>
      <button type="button" data-onboarding-action="skip"></button>
    </div>
  `;

  popover.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-onboarding-action]");
    if (!btn) {
      return;
    }

    const action = btn.getAttribute("data-onboarding-action");
    if (action === "back") {
      showOnboardingStep(onboarding.stepIndex - 1);
      return;
    }
    if (action === "next") {
      if (onboarding.stepIndex >= ONBOARDING_STEPS.length - 1) {
        closeOnboarding("completed");
      } else {
        showOnboardingStep(onboarding.stepIndex + 1);
      }
      return;
    }
    if (action === "skip") {
      closeOnboarding("skipped");
    }
  });

  document.body.append(overlay, popover);
  onboarding.overlayEl = overlay;
  onboarding.popoverEl = popover;
}

function showOnboardingStep(nextIndex) {
  if (!onboarding.active) {
    return;
  }

  const clamped = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, nextIndex));
  onboarding.stepIndex = clamped;
  const step = ONBOARDING_STEPS[clamped];
  if (!step) {
    closeOnboarding("completed");
    return;
  }

  if (typeof step.onBeforeShow === "function") {
    step.onBeforeShow();
  }

  updateOnboardingContent(step, clamped);
  focusOnboardingTarget(step);
  positionOnboardingPopover();
}

function updateOnboardingContent(step, stepIndex) {
  const popover = onboarding.popoverEl;
  if (!popover) {
    return;
  }

  const stepCopy = getOnboardingCopy(step.id);
  const header = popover.querySelector(".onboarding-header");
  const stepCounter = popover.querySelector(".onboarding-step");
  const title = popover.querySelector(".onboarding-title");
  const body = popover.querySelector(".onboarding-body");
  const backBtn = popover.querySelector('[data-onboarding-action="back"]');
  const nextBtn = popover.querySelector('[data-onboarding-action="next"]');
  const skipBtn = popover.querySelector('[data-onboarding-action="skip"]');

  if (header) {
    header.textContent = t("onboarding_header");
  }
  if (stepCounter) {
    stepCounter.textContent = t("onboarding_step_counter", {
      current: stepIndex + 1,
      total: ONBOARDING_STEPS.length,
    });
  }
  if (title) {
    title.textContent = stepCopy.title;
  }
  if (body) {
    body.textContent = stepCopy.body;
  }
  if (backBtn) {
    backBtn.textContent = t("onboarding_back");
    backBtn.disabled = stepIndex === 0;
  }
  if (nextBtn) {
    nextBtn.textContent = stepIndex === ONBOARDING_STEPS.length - 1 ? t("onboarding_finish") : t("onboarding_next");
  }
  if (skipBtn) {
    skipBtn.textContent = t("onboarding_skip");
  }
}

function getOnboardingCopy(stepId) {
  const lang = state.uiLanguage === "es" ? "es" : "en";
  return ONBOARDING_COPY[lang]?.[stepId] || ONBOARDING_COPY.en[stepId] || {
    title: stepId,
    body: "",
  };
}

function focusOnboardingTarget(step) {
  clearOnboardingHighlight();
  const target = resolveOnboardingTarget(step.targets);
  onboarding.targetEl = target;
  if (target) {
    target.classList.add("onboarding-highlight");
  }
}

function resolveOnboardingTarget(targets) {
  const selectors = Array.isArray(targets) ? targets : [targets];
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node && isOnboardingTargetVisible(node)) {
      return node;
    }
  }
  return null;
}

function isOnboardingTargetVisible(node) {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  const style = window.getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  return node.getClientRects().length > 0;
}

function refreshOnboardingPosition() {
  if (!onboarding.active) {
    return;
  }
  const step = ONBOARDING_STEPS[onboarding.stepIndex];
  if (!step) {
    return;
  }
  onboarding.targetEl = resolveOnboardingTarget(step.targets);
  if (onboarding.targetEl) {
    onboarding.targetEl.classList.add("onboarding-highlight");
  }
  positionOnboardingPopover();
}

function positionOnboardingPopover() {
  const popover = onboarding.popoverEl;
  if (!popover) {
    return;
  }

  const margin = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popoverRect = popover.getBoundingClientRect();
  const target = onboarding.targetEl;

  let top = margin;
  let left = margin;

  if (!target) {
    top = Math.max(margin, (viewportHeight - popoverRect.height) / 2);
    left = Math.max(margin, (viewportWidth - popoverRect.width) / 2);
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    return;
  }

  const rect = target.getBoundingClientRect();
  const roomRight = viewportWidth - rect.right;
  const roomLeft = rect.left;
  const placeRight = roomRight >= popoverRect.width + margin;
  const placeLeft = roomLeft >= popoverRect.width + margin;

  if (placeRight) {
    left = rect.right + margin;
    top = rect.top;
  } else if (placeLeft) {
    left = rect.left - popoverRect.width - margin;
    top = rect.top;
  } else {
    left = Math.max(margin, Math.min(rect.left, viewportWidth - popoverRect.width - margin));
    top = rect.bottom + margin;
  }

  top = Math.max(margin, Math.min(top, viewportHeight - popoverRect.height - margin));
  left = Math.max(margin, Math.min(left, viewportWidth - popoverRect.width - margin));

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function clearOnboardingHighlight() {
  if (onboarding.targetEl) {
    onboarding.targetEl.classList.remove("onboarding-highlight");
  }
  onboarding.targetEl = null;
}

function closeOnboarding(status) {
  clearOnboardingHighlight();
  if (onboarding.overlayEl) {
    onboarding.overlayEl.remove();
  }
  if (onboarding.popoverEl) {
    onboarding.popoverEl.remove();
  }
  onboarding.overlayEl = null;
  onboarding.popoverEl = null;
  onboarding.active = false;
  teardownOnboardingDemoProject();
  setOnboardingStatus(status);
}

function setupOnboardingDemoProject() {
  onboarding.snapshot = {
    project: cloneProject(state.project),
    activeSegmentId: state.activeSegmentId,
  };

  const now = new Date().toISOString();
  state.project = {
    meta: {
      name: "Onboarding Demo Project",
      sourceLanguage: "en",
      targetLanguage: "es",
      splitMode: "sentence",
      editorPosition: "bottom",
      createdAt: now,
      updatedAt: now,
    },
    sourceText: [
      "Adagio Translate helps freelancers deliver consistent translations.",
      "Click a segment to edit your target text.",
      "Use Local Settings to choose machine translation options.",
      "Glossary terms keep repeated words aligned across the project.",
    ].join(" "),
    segments: [
      {
        id: "seg-1",
        index: 0,
        source: "Adagio Translate helps freelancers deliver consistent translations.",
        translation: "Adagio Translate ayuda a profesionales independientes a entregar traducciones consistentes.",
      },
      {
        id: "seg-2",
        index: 1,
        source: "Click a segment to edit your target text.",
        translation: "",
      },
      {
        id: "seg-3",
        index: 2,
        source: "Use Local Settings to choose machine translation options.",
        translation: "Usa Configuración local para elegir opciones de traducción automática.",
      },
      {
        id: "seg-4",
        index: 3,
        source: "Glossary terms keep repeated words aligned across the project.",
        translation: "",
      },
    ],
    glossary: [
      {
        targetTerm: "segment",
        translation: "segmento",
        addedAt: now,
      },
      {
        targetTerm: "settings",
        translation: "configuración",
        addedAt: now,
      },
      {
        targetTerm: "glossary",
        translation: "glosario",
        addedAt: now,
      },
    ],
  };
  state.activeSegmentId = "seg-2";
  onboarding.demoLoaded = true;
  renderAll();
}

function teardownOnboardingDemoProject() {
  if (!onboarding.demoLoaded) {
    onboarding.snapshot = null;
    return;
  }

  if (onboarding.snapshot?.project) {
    state.project = cloneProject(onboarding.snapshot.project);
    state.activeSegmentId = onboarding.snapshot.activeSegmentId || state.project.segments[0]?.id || null;
  }

  onboarding.demoLoaded = false;
  onboarding.snapshot = null;
  renderAll();
}

function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
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
    renderSegments();
    renderGlossary();
    stampUpdated();
  });

  els.glossaryCancelBtn.addEventListener("click", () => {
    pendingGlossarySelection = "";
    els.glossaryDialog.close();
  });

  els.glossaryMatchesCloseBtn.addEventListener("click", () => {
    els.glossaryMatchesDialog.close();
  });
}

function bindLocalSettings() {
  els.localSettingsBtn.addEventListener("click", openLocalSettingsDialog);
  els.saveGoogleKeyBtn.addEventListener("click", saveMachineTranslationSettings);
  els.clearGoogleKeyBtn.addEventListener("click", clearMachineTranslationKeys);
  els.appUiLanguageSelect.addEventListener("change", () => {
    const lang = els.appUiLanguageSelect.value === "es" ? "es" : "en";
    state.uiLanguage = lang;
    try {
      localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error(error);
    }
    applyUiLanguage();
    setMtStatus(t("local_settings_local_notice"), false);
    renderAll();
  });
  els.localSettingsCloseBtn.addEventListener("click", () => {
    els.localSettingsDialog.close();
  });
}

function bindResponsiveLayout() {
  const mql = window.matchMedia("(max-width: 980px)");
  const onChange = () => renderAll();
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
  } else if (typeof mql.addListener === "function") {
    mql.addListener(onChange);
  }
}

function bindSegmentEditor() {
  els.segmentList.addEventListener("click", (event) => {
    const addGlossaryBtn = event.target.closest(".segment-add-glossary-btn");
    if (addGlossaryBtn) {
      event.stopPropagation();
      openGlossaryDialog();
      return;
    }

    const glossaryInlineText = event.target.closest(".segment-inline-glossary-text");
    if (glossaryInlineText) {
      event.stopPropagation();
      openGlossaryMatchesDialog();
      return;
    }

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
  const confirmed = confirm(t("start_new_project_confirm"));
  if (!confirmed) {
    return;
  }

  state.project = {
    meta: {
      name: "",
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
        alert(t("could_not_open_picker_fallback"));
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
    alert(t("empty_document_file"));
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
      alert(t("project_saved"));
      return;
    } catch (error) {
      if (error && error.name !== "AbortError") {
        console.error(error);
        alert(t("could_not_save_picker_fallback"));
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
        alert(t("could_not_open_picker_fallback"));
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
    alert(t("invalid_project_file"));
  }
}

async function translateActiveSegment(triggerButton = null) {
  const activeSegment = getActiveSegment();
  if (!activeSegment) {
    setMtStatus(t("select_segment_first"), true);
    return;
  }

  const source = state.project.meta.sourceLanguage;
  const target = state.project.meta.targetLanguage;
  if (!source || !target) {
    setMtStatus(t("set_languages_first"), true);
    return;
  }

  const provider = getMachineTranslationProvider();
  if (!isProviderConfigured(provider)) {
    setMtStatus(t("configure_mt_first"), true);
    return;
  }

  if (!activeSegment.source.trim()) {
    setMtStatus(t("selected_segment_no_source"), true);
    return;
  }

  const buttonEl = triggerButton instanceof HTMLButtonElement ? triggerButton : null;
  const previousButtonText = buttonEl ? buttonEl.textContent : "";
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = t("translating");
  }
  setMtStatus(t("requesting_translation"), false);

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
    setMtStatus(t("segment_translated"), false);
  } catch (error) {
    console.error(error);
    setMtStatus(error.message || t("translation_failed"), true);
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
    alert(t("no_translated_segments"));
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
    alert(t("no_translated_segments"));
    return;
  }

  if (!window.docx) {
    alert(t("docx_export_unavailable"));
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
    alert(t("could_not_export_docx"));
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
  const provider = (els.mtProviderSelect.value || "mymemory").trim();
  const googleKey = (els.googleApiKeyInput.value || "").trim();
  const myMemoryEmail = (els.myMemoryEmailInput.value || "").trim();
  const uiLanguage = els.appUiLanguageSelect.value === "es" ? "es" : "en";
  try {
    localStorage.setItem(MT_PROVIDER_STORAGE_KEY, provider);
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, uiLanguage);
    state.uiLanguage = uiLanguage;
    if (googleKey) {
      localStorage.setItem(GOOGLE_API_KEY_STORAGE_KEY, googleKey);
    }
    if (myMemoryEmail) {
      localStorage.setItem(MYMEMORY_EMAIL_STORAGE_KEY, myMemoryEmail);
    } else {
      localStorage.removeItem(MYMEMORY_EMAIL_STORAGE_KEY);
    }
    setMtStatus(t("local_settings_saved"), false);
    applyUiLanguage();
    renderSegments();
  } catch (error) {
    console.error(error);
    setMtStatus(t("local_settings_save_failed"), true);
  }
}

function clearMachineTranslationKeys() {
  try {
    localStorage.removeItem(GOOGLE_API_KEY_STORAGE_KEY);
    localStorage.removeItem(MYMEMORY_EMAIL_STORAGE_KEY);
    els.googleApiKeyInput.value = "";
    els.myMemoryEmailInput.value = "";
    setMtStatus(t("api_keys_cleared"), false);
    renderSegments();
  } catch (error) {
    console.error(error);
    setMtStatus(t("api_keys_clear_failed"), true);
  }
}

function loadMachineTranslationSettingsFromStorage() {
  try {
    state.uiLanguage = resolvePreferredUiLanguage();
    els.appUiLanguageSelect.value = state.uiLanguage;
    els.mtProviderSelect.value = getMachineTranslationProvider();
    els.googleApiKeyInput.value = getStoredGoogleApiKey();
    els.myMemoryEmailInput.value = getStoredMyMemoryEmail();
    setMtStatus(t("local_settings_loaded"), false);
  } catch (error) {
    console.error(error);
    setMtStatus(t("local_settings_read_failed"), true);
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
  refreshOnboardingPosition();
}

function renderMeta() {
  const { name, sourceLanguage, targetLanguage } = state.project.meta;
  const displayName = name || t("untitled_project");
  const sourceLabel = getLanguageLabel(sourceLanguage);
  const targetLabel = getLanguageLabel(targetLanguage);
  const langText = sourceLanguage && targetLanguage ? `${sourceLabel} -> ${targetLabel}` : t("no_languages_set");
  els.projectMeta.textContent = `${displayName} | ${langText}`;

  els.splitMode.value = state.project.meta.splitMode || "sentence";
  els.editorPosition.value = state.project.meta.editorPosition || "bottom";
}

function renderSegments() {
  els.segmentList.innerHTML = "";
  const hasMachineTranslation = isProviderConfigured(getMachineTranslationProvider());
  const compact = isCompactLayout();

  state.project.segments.forEach((segment, idx) => {
    const item = document.createElement("li");
    item.className = "segment-item";
    item.dataset.segmentId = segment.id;
    if (segment.id === state.activeSegmentId) {
      item.classList.add("active");
    }

    const translationStatus = segment.translation.trim() ? t("status_translated") : t("status_pending");
    item.title = `${t("status_prefix")}: ${translationStatus}`;

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
      label.textContent = `${getLanguageLabel(state.project.meta.targetLanguage) || t("target_language")} ${t("target_translation")}`;
      editActions.appendChild(label);

      if (hasMachineTranslation) {
        const autoTranslateBtn = document.createElement("button");
        autoTranslateBtn.type = "button";
        autoTranslateBtn.className = "segment-auto-translate-btn";
        autoTranslateBtn.textContent = t("auto_translate_segment");
        editActions.appendChild(autoTranslateBtn);
      }

      if (compact) {
        editBlock.appendChild(buildInlineGlossaryBlock());
      }

      const input = document.createElement("textarea");
      input.className = "segment-translation-input";
      input.placeholder = t("write_translation_here");
      input.value = segment.translation || "";
      input.dataset.segmentId = segment.id;

      editBlock.append(editActions, input);
      content.appendChild(editBlock);
    }

    item.appendChild(content);
    els.segmentList.appendChild(item);
  });

  els.segmentCount.textContent = t("segment_count", { count: state.project.segments.length });
}

function buildInlineGlossaryBlock() {
  const wrap = document.createElement("div");
  wrap.className = "segment-inline-glossary";

  const header = document.createElement("div");
  header.className = "segment-inline-glossary-header";

  const text = document.createElement("span");
  text.className = "segment-inline-glossary-text";
  text.title = t("view_all_glossary_matches");

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "segment-add-glossary-btn";
  addBtn.textContent = t("add_entry");

  const entries = getRelevantGlossaryEntries();
  if (!entries.length) {
    text.textContent = `${t("glossary_summary_prefix")}: ${t("glossary_no_matches").toLowerCase()}`;
  } else {
    const summary = entries.map((entry) => `${entry.targetTerm} = ${entry.translation}`).join(" | ");
    text.textContent = `${t("glossary_summary_prefix")}: ${summary}`;
  }

  header.append(text, addBtn);
  wrap.append(header);
  return wrap;
}

function openGlossaryMatchesDialog() {
  const entries = getRelevantGlossaryEntries();
  els.glossaryMatchesList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.textContent = t("glossary_no_matches");
    els.glossaryMatchesList.appendChild(empty);
    els.glossaryMatchesDialog.showModal();
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    const term = document.createElement("strong");
    term.textContent = entry.targetTerm;
    const translation = document.createElement("span");
    translation.textContent = entry.translation;
    item.append(term, translation);
    els.glossaryMatchesList.appendChild(item);
  });

  els.glossaryMatchesDialog.showModal();
}

function renderGlossary() {
  els.glossaryList.innerHTML = "";
  const entries = getRelevantGlossaryEntries();

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.textContent = t("glossary_no_entries");
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

function isCompactLayout() {
  return window.matchMedia("(max-width: 980px)").matches;
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
  if (onboarding.demoLoaded) {
    return;
  }

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
    state.project = normalizeProjectData(storedProject, "");

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

function normalizeProjectData(parsed, fallbackName = "") {
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
  const map = state.uiLanguage === "es" ? LANGUAGE_LABELS_ES : LANGUAGE_LABELS;
  return map[code] || LANGUAGE_LABELS[code] || code;
}

function openLocalSettingsDialog() {
  els.appUiLanguageSelect.value = state.uiLanguage;
  els.mtProviderSelect.value = getMachineTranslationProvider();
  els.googleApiKeyInput.value = getStoredGoogleApiKey();
  els.myMemoryEmailInput.value = getStoredMyMemoryEmail();
  setMtStatus(t("local_settings_local_notice"), false);
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
    if (stored === "google" || stored === "mymemory" || stored === "none") {
      return stored;
    }
    return "mymemory";
  } catch (error) {
    console.error(error);
    return "mymemory";
  }
}

function isProviderConfigured(provider) {
  if (!provider || provider === "none") {
    return false;
  }
  if (provider === "google") {
    return Boolean(getStoredGoogleApiKey());
  }
  return provider === "mymemory";
}

function normalizeLangCode(code) {
  return String(code || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
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
