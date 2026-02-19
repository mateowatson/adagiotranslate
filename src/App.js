import { React, html } from "./lib.js";
import {
  getLanguageLabel,
  getLocalizedLanguageOptions,
  ONBOARDING_COPY,
  ONBOARDING_STATUS_STORAGE_KEY,
  resolvePreferredUiLanguage,
  translate,
} from "./constants.js";
import { Header } from "./components/Header.js";
import { SegmentsPanel } from "./components/SegmentsPanel.js";
import { GlossaryPanel } from "./components/GlossaryPanel.js";
import { ProjectSetupDialog } from "./components/dialogs/ProjectSetupDialog.js";
import { GlossaryDialog } from "./components/dialogs/GlossaryDialog.js";
import { GlossaryMatchesDialog } from "./components/dialogs/GlossaryMatchesDialog.js";
import { LocalSettingsDialog } from "./components/dialogs/LocalSettingsDialog.js";
import { OnboardingTour } from "./components/OnboardingTour.js";
import { readTextFromFile } from "./utils/docxImport.js";
import {
  createEmptyProject,
  getRelevantGlossaryEntries,
  normalizeProjectData,
  sanitizeFilename,
  segmentSourceText,
  serializeProject,
  stripExtension,
  upsertGlossaryEntry,
} from "./utils/project.js";
import { clearApiKeys, loadLocalSettings, loadProject, persistProject, saveLocalSettings } from "./utils/storage.js";
import { exportTargetAsDocx, exportTargetAsMarkdown, downloadTextFile } from "./utils/exporters.js";
import { isProviderConfigured, requestTranslationByProvider } from "./utils/translation.js";

const { useEffect, useMemo, useRef, useState } = React;
const ONBOARDING_STEPS = [
  {
    id: "file_menu",
    targets: ["#menu-file > summary", "#menu-file"],
  },
  {
    id: "segments",
    targets: [".segments-panel", "#segment-list"],
  },
  {
    id: "translation",
    targets: [".segment-translation-input", "#segment-list"],
    requiresActiveSegment: true,
  },
  {
    id: "auto_translate",
    targets: [".segment-auto-translate-btn", "#local-settings-btn"],
    requiresActiveSegment: true,
  },
  {
    id: "glossary",
    targets: [".segment-inline-glossary", ".segment-add-glossary-btn", "#add-glossary-btn", ".glossary-panel"],
    requiresActiveSegment: true,
  },
  {
    id: "local_settings",
    targets: ["#local-settings-btn"],
  },
];

export function App() {
  const bootUi = resolvePreferredUiLanguage();
  const bootSettings = loadLocalSettings();
  const bootProject = loadProject();

  const [uiLanguage, setUiLanguage] = useState(bootSettings.uiLanguage === "en" || bootSettings.uiLanguage === "es" ? bootSettings.uiLanguage : bootUi);
  const [project, setProject] = useState(bootProject?.project || createEmptyProject());
  const [activeSegmentId, setActiveSegmentId] = useState(bootProject?.activeSegmentId || null);

  const [localSettings, setLocalSettings] = useState({
    uiLanguage: bootSettings.uiLanguage === "en" || bootSettings.uiLanguage === "es" ? bootSettings.uiLanguage : bootUi,
    mtProvider: ["none", "mymemory", "google"].includes(bootSettings.mtProvider) ? bootSettings.mtProvider : "mymemory",
    googleApiKey: bootSettings.googleApiKey || "",
    myMemoryEmail: bootSettings.myMemoryEmail || "",
  });
  const [localSettingsStatus, setLocalSettingsStatus] = useState("");

  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupValues, setSetupValues] = useState({ sourceLanguage: "", targetLanguage: "", splitMode: "sentence" });
  const pendingImportRef = useRef({ text: "", name: "" });

  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
  const [glossaryValues, setGlossaryValues] = useState({ targetTerm: "", translation: "" });

  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [matchesSegmentId, setMatchesSegmentId] = useState(null);

  const [localSettingsOpen, setLocalSettingsOpen] = useState(false);

  const [isCompact, setIsCompact] = useState(window.matchMedia("(max-width: 980px)").matches);
  const [translatingSegmentId, setTranslatingSegmentId] = useState(null);
  const [mtStatusBySegmentId, setMtStatusBySegmentId] = useState({});
  const [onboardingActive, setOnboardingActive] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);

  const docFileInputRef = useRef(null);
  const projectFileInputRef = useRef(null);
  const onboardingSnapshotRef = useRef(null);
  const onboardingDemoLoadedRef = useRef(false);

  const t = (key, vars = {}) => translate(uiLanguage, key, vars);
  const languageOptions = useMemo(() => getLocalizedLanguageOptions(uiLanguage), [uiLanguage]);

  useEffect(() => {
    document.documentElement.lang = uiLanguage;
  }, [uiLanguage]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const update = () => setIsCompact(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    try {
      persistProject(project, activeSegmentId);
    } catch (error) {
      console.warn("Could not persist project to local storage.", error);
    }
  }, [project, activeSegmentId]);

  const sourceLabel = getLanguageLabel(project.meta.sourceLanguage, uiLanguage);
  const targetLabel = getLanguageLabel(project.meta.targetLanguage, uiLanguage);
  const projectMetaText = `${project.meta.name || t("untitled_project")} | ${project.meta.sourceLanguage && project.meta.targetLanguage ? `${sourceLabel} -> ${targetLabel}` : t("no_languages_set")}`;

  const relevantGlossary = getRelevantGlossaryEntries(project, activeSegmentId);

  function stampUpdated(nextProject) {
    nextProject.meta.updatedAt = new Date().toISOString();
  }

  function setProjectWith(updateFn) {
    setProject((prev) => {
      const next = structuredClone(prev);
      updateFn(next);
      return next;
    });
  }

  function buildOnboardingDemoProject() {
    const now = new Date().toISOString();
    return {
      meta: {
        name: "Adagio Demo",
        sourceLanguage: "en",
        targetLanguage: "es",
        splitMode: "sentence",
        editorPosition: "bottom",
        createdAt: now,
        updatedAt: now,
      },
      sourceText: [
        "Welcome to Adagio Translate.",
        "Click a segment to edit your target text.",
        "Use the glossary to keep terms consistent.",
      ].join("\n\n"),
      segments: [
        { id: "seg-1", source: "Welcome to Adagio Translate.", translation: "Bienvenido a Adagio Translate.", index: 0, paragraphIndex: 0 },
        { id: "seg-2", source: "Click a segment to edit your target text.", translation: "", index: 1, paragraphIndex: 1 },
        { id: "seg-3", source: "Use the glossary to keep terms consistent.", translation: "", index: 2, paragraphIndex: 2 },
      ],
      glossary: [
        { targetTerm: "segment", translation: "segmento", addedAt: now, updatedAt: null },
        { targetTerm: "glossary", translation: "glosario", addedAt: now, updatedAt: null },
      ],
    };
  }

  function startOnboardingIfNeeded() {
    let status = "";
    try {
      status = localStorage.getItem(ONBOARDING_STATUS_STORAGE_KEY) || "";
    } catch (error) {
      console.warn(error);
    }
    if (status === "completed" || status === "skipped") {
      return;
    }

    if (!project.segments.length) {
      onboardingSnapshotRef.current = {
        project: structuredClone(project),
        activeSegmentId,
      };
      const demo = buildOnboardingDemoProject();
      onboardingDemoLoadedRef.current = true;
      setProject(demo);
      setActiveSegmentId(demo.segments[0]?.id || null);
    }

    setOnboardingStepIndex(0);
    setOnboardingActive(true);
  }

  function closeOnboarding(status) {
    setOnboardingActive(false);
    try {
      localStorage.setItem(ONBOARDING_STATUS_STORAGE_KEY, status);
    } catch (error) {
      console.warn(error);
    }

    if (onboardingDemoLoadedRef.current && onboardingSnapshotRef.current?.project) {
      setProject(onboardingSnapshotRef.current.project);
      setActiveSegmentId(onboardingSnapshotRef.current.activeSegmentId || onboardingSnapshotRef.current.project.segments[0]?.id || null);
    }
    onboardingDemoLoadedRef.current = false;
    onboardingSnapshotRef.current = null;
  }

  function resegmentFromSource(nextSplitMode = project.meta.splitMode) {
    const text = project.sourceText || "";
    if (!text.trim()) return;
    const nextSegments = segmentSourceText(text, nextSplitMode);
    setProjectWith((next) => {
      next.meta.splitMode = nextSplitMode;
      next.segments = nextSegments;
      if (!next.meta.createdAt) next.meta.createdAt = new Date().toISOString();
      stampUpdated(next);
    });
    setActiveSegmentId(nextSegments[0]?.id || null);
  }

  function newProject() {
    if (!confirm(t("start_new_project_confirm"))) return;
    const fresh = createEmptyProject();
    fresh.meta.createdAt = new Date().toISOString();
    fresh.meta.updatedAt = fresh.meta.createdAt;
    setProject(fresh);
    setActiveSegmentId(null);
  }

  async function handleDocumentImport(file) {
    const text = await readTextFromFile(file);
    if (!text.trim()) {
      alert(t("empty_document_file"));
      return;
    }
    pendingImportRef.current = { text, name: file.name };
    setSetupValues({
      sourceLanguage: project.meta.sourceLanguage || "",
      targetLanguage: project.meta.targetLanguage || "",
      splitMode: project.meta.splitMode || "sentence",
    });
    setSetupModalOpen(true);
  }

  function completeProjectSetup() {
    const pending = pendingImportRef.current;
    if (!pending.text) return;

    const segments = segmentSourceText(pending.text, setupValues.splitMode);
    const now = new Date().toISOString();
    const next = createEmptyProject();
    next.meta.name = stripExtension(pending.name || project.meta.name || "");
    next.meta.sourceLanguage = setupValues.sourceLanguage;
    next.meta.targetLanguage = setupValues.targetLanguage;
    next.meta.splitMode = setupValues.splitMode;
    next.meta.editorPosition = project.meta.editorPosition || "bottom";
    next.meta.createdAt = now;
    next.meta.updatedAt = now;
    next.sourceText = pending.text;
    next.segments = segments;

    setProject(next);
    setActiveSegmentId(segments[0]?.id || null);
    setSetupModalOpen(false);
    pendingImportRef.current = { text: "", name: "" };
  }

  function updateSegmentTranslation(segmentId, value) {
    setProjectWith((next) => {
      const segment = next.segments.find((item) => item.id === segmentId);
      if (!segment) return;
      segment.translation = value;
      stampUpdated(next);
    });
  }

  function getGlossaryEntriesForSegment(segmentId) {
    return getRelevantGlossaryEntries(project, segmentId);
  }

  function openGlossaryDialog(segmentId = null) {
    const segment = project.segments.find((item) => item.id === (segmentId || activeSegmentId));
    setGlossaryValues({ targetTerm: "", translation: "" });
    if (segment && segment.source) {
      setGlossaryValues((prev) => ({ ...prev, targetTerm: "" }));
    }
    setGlossaryModalOpen(true);
  }

  function saveGlossaryEntry() {
    const targetTerm = String(glossaryValues.targetTerm || "").trim();
    const translation = String(glossaryValues.translation || "").trim();
    if (!targetTerm || !translation) return;

    setProjectWith((next) => {
      upsertGlossaryEntry(next, {
        targetTerm,
        translation,
        addedAt: new Date().toISOString(),
        updatedAt: null,
      });
      stampUpdated(next);
    });

    setGlossaryModalOpen(false);
    setGlossaryValues({ targetTerm: "", translation: "" });
  }

  function openGlossaryMatches(segmentId) {
    setMatchesSegmentId(segmentId || activeSegmentId);
    setMatchesModalOpen(true);
  }

  function saveProjectFile(forceNew = false) {
    const payload = serializeProject(project);

    if (window.showSaveFilePicker) {
      window.showSaveFilePicker({
        suggestedName: `${sanitizeFilename(project.meta.name || "adagio-project")}.adagio.json`,
        types: [{ description: "Adagio Translate Project", accept: { "application/json": [".adagio.json"] } }],
      }).then(async (handle) => {
        const writable = await handle.createWritable();
        await writable.write(payload);
        await writable.close();
        alert(t("project_saved"));
      }).catch(() => {
        downloadTextFile(`${sanitizeFilename(project.meta.name || "adagio-project")}.adagio.json`, payload, "application/json");
      });
      return;
    }

    downloadTextFile(`${sanitizeFilename(project.meta.name || "adagio-project")}.adagio.json`, payload, "application/json");
  }

  function openProjectPicker() {
    projectFileInputRef.current?.click();
  }

  async function loadProjectFromFile(file) {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const normalized = normalizeProjectData(parsed, stripExtension(file.name));
      setProject(normalized);
      setActiveSegmentId(normalized.segments[0]?.id || null);
    } catch (error) {
      console.error(error);
      alert(t("invalid_project_file"));
    }
  }

  async function exportMarkdown() {
    const result = exportTargetAsMarkdown(project, project.meta.name, sourceLabel || project.meta.sourceLanguage, targetLabel || project.meta.targetLanguage);
    if (!result.ok) {
      alert(t("no_translated_segments"));
    }
  }

  async function exportDocx() {
    const result = await exportTargetAsDocx(project);
    if (!result.ok) {
      if (result.reason === "lib") alert(t("docx_export_unavailable"));
      else if (result.reason === "pack") alert(t("could_not_export_docx"));
      else alert(t("no_translated_segments"));
    }
  }

  function runEditAction(action) {
    const map = {
      undo: "undo",
      redo: "redo",
      cut: "cut",
      copy: "copy",
      paste: "paste",
      selectAll: "selectAll",
    };
    const command = map[action];
    if (command) {
      document.execCommand(command);
    }
  }

  async function autoTranslateSegment(segmentId) {
    const segment = project.segments.find((item) => item.id === segmentId);
    if (!segment) {
      setMtStatusBySegmentId((prev) => ({ ...prev, [segmentId]: t("select_segment_first") }));
      return;
    }
    if (!project.meta.sourceLanguage || !project.meta.targetLanguage) {
      setMtStatusBySegmentId((prev) => ({ ...prev, [segmentId]: t("set_languages_first") }));
      return;
    }
    if (!isProviderConfigured(localSettings.mtProvider, localSettings.googleApiKey)) {
      setMtStatusBySegmentId((prev) => ({ ...prev, [segmentId]: t("configure_mt_first") }));
      return;
    }
    if (!segment.source.trim()) {
      setMtStatusBySegmentId((prev) => ({ ...prev, [segmentId]: t("selected_segment_no_source") }));
      return;
    }

    setTranslatingSegmentId(segmentId);
    setMtStatusBySegmentId((prev) => ({ ...prev, [segmentId]: t("requesting_translation") }));

    try {
      const translated = await requestTranslationByProvider({
        provider: localSettings.mtProvider,
        source: project.meta.sourceLanguage,
        target: project.meta.targetLanguage,
        text: segment.source,
        googleApiKey: localSettings.googleApiKey,
        myMemoryEmail: localSettings.myMemoryEmail,
      });

      setProjectWith((next) => {
        const target = next.segments.find((item) => item.id === segmentId);
        if (target) target.translation = translated;
        stampUpdated(next);
      });
      setMtStatusBySegmentId((prev) => ({ ...prev, [segmentId]: t("segment_translated") }));
    } catch (error) {
      setMtStatusBySegmentId((prev) => ({ ...prev, [segmentId]: error.message || t("translation_failed") }));
    } finally {
      setTranslatingSegmentId(null);
    }
  }

  function applyLocalSettings() {
    saveLocalSettings(localSettings);
    setUiLanguage(localSettings.uiLanguage === "es" ? "es" : "en");
    setLocalSettingsStatus(t("local_settings_saved"));
  }

  function handleHeaderAction(action) {
    if (action === "new") newProject();
    if (action === "import") docFileInputRef.current?.click();
    if (action === "open") openProjectPicker();
    if (action === "save") saveProjectFile(false);
    if (action === "saveAs") saveProjectFile(true);
    if (action === "exportMd") exportMarkdown();
    if (action === "exportDocx") exportDocx();
    if (action === "localSettings") {
      setLocalSettingsStatus(t("local_settings_loaded"));
      setLocalSettingsOpen(true);
    }
  }

  useEffect(() => {
    startOnboardingIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!onboardingActive) return;
    const step = ONBOARDING_STEPS[onboardingStepIndex];
    if (!step?.requiresActiveSegment) return;
    if (!activeSegmentId && project.segments.length) {
      setActiveSegmentId(project.segments[0].id);
    }
  }, [onboardingActive, onboardingStepIndex, activeSegmentId, project.segments]);

  const currentMatchEntries = matchesModalOpen ? getGlossaryEntriesForSegment(matchesSegmentId || activeSegmentId) : [];
  const onboardingStep = onboardingActive ? ONBOARDING_STEPS[onboardingStepIndex] : null;
  const onboardingCopyTable = uiLanguage === "es" ? ONBOARDING_COPY.es : ONBOARDING_COPY.en;
  const onboardingCopy = onboardingStep ? onboardingCopyTable[onboardingStep.id] || ONBOARDING_COPY.en[onboardingStep.id] : null;

  return html`
    <div>
      <${Header}
        t=${t}
        projectMetaText=${projectMetaText}
        splitMode=${project.meta.splitMode}
        editorPosition=${project.meta.editorPosition}
        onSplitModeChange=${(value) => {
          setProjectWith((next) => { next.meta.splitMode = value; });
          resegmentFromSource(value);
        }}
        onEditorPositionChange=${(value) => {
          setProjectWith((next) => {
            next.meta.editorPosition = value;
            stampUpdated(next);
          });
        }}
        onAction=${handleHeaderAction}
        onEditAction=${runEditAction}
      />

      <main className=${`workspace ${project.meta.editorPosition === "bottom" ? "editor-bottom" : "editor-right"}`}>
        <${SegmentsPanel}
          t=${t}
          segments=${project.segments}
          activeSegmentId=${activeSegmentId}
          targetLanguageLabel=${targetLabel}
          segmentCountText=${t("segment_count", { count: project.segments.length })}
          compact=${isCompact}
          isMtConfigured=${isProviderConfigured(localSettings.mtProvider, localSettings.googleApiKey)}
          getGlossaryEntriesForSegment=${getGlossaryEntriesForSegment}
          onResegment=${() => resegmentFromSource(project.meta.splitMode)}
          onSelectSegment=${(id) => setActiveSegmentId(id)}
          onChangeTranslation=${updateSegmentTranslation}
          onAutoTranslate=${autoTranslateSegment}
          onAddGlossary=${openGlossaryDialog}
          onViewGlossaryMatches=${openGlossaryMatches}
          translatingSegmentId=${translatingSegmentId}
          mtStatusBySegmentId=${mtStatusBySegmentId}
        />

        ${!isCompact ? html`
          <${GlossaryPanel}
            t=${t}
            entries=${relevantGlossary}
            onAddEntry=${() => openGlossaryDialog(activeSegmentId)}
          />
        ` : null}
      </main>

      <input
        ref=${docFileInputRef}
        type="file"
        className="hidden"
        onChange=${async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleDocumentImport(file);
          e.target.value = "";
        }}
      />

      <input
        ref=${projectFileInputRef}
        type="file"
        className="hidden"
        accept=".adagio.json,.json"
        onChange=${async (e) => {
          const file = e.target.files?.[0];
          if (file) await loadProjectFromFile(file);
          e.target.value = "";
        }}
      />

      <${ProjectSetupDialog}
        t=${t}
        isOpen=${setupModalOpen}
        values=${setupValues}
        languageOptions=${languageOptions}
        onClose=${() => setSetupModalOpen(false)}
        onChange=${setSetupValues}
        onSubmit=${completeProjectSetup}
      />

      <${GlossaryDialog}
        t=${t}
        isOpen=${glossaryModalOpen}
        values=${glossaryValues}
        onChange=${setGlossaryValues}
        onClose=${() => setGlossaryModalOpen(false)}
        onSubmit=${saveGlossaryEntry}
      />

      <${GlossaryMatchesDialog}
        t=${t}
        isOpen=${matchesModalOpen}
        entries=${currentMatchEntries}
        onClose=${() => setMatchesModalOpen(false)}
      />

      <${LocalSettingsDialog}
        t=${t}
        isOpen=${localSettingsOpen}
        values=${localSettings}
        status=${localSettingsStatus}
        onChange=${setLocalSettings}
        onClose=${() => setLocalSettingsOpen(false)}
        onClearKeys=${() => {
          clearApiKeys();
          setLocalSettings((prev) => ({ ...prev, googleApiKey: "", myMemoryEmail: "" }));
        }}
        onSave=${applyLocalSettings}
      />

      <${OnboardingTour}
        t=${t}
        active=${onboardingActive}
        step=${onboardingStep}
        stepIndex=${onboardingStepIndex}
        total=${ONBOARDING_STEPS.length}
        copy=${onboardingCopy}
        onBack=${() => setOnboardingStepIndex((idx) => Math.max(0, idx - 1))}
        onNext=${() => {
          if (onboardingStepIndex >= ONBOARDING_STEPS.length - 1) {
            closeOnboarding("completed");
            return;
          }
          setOnboardingStepIndex((idx) => Math.min(ONBOARDING_STEPS.length - 1, idx + 1));
        }}
        onSkip=${() => closeOnboarding("skipped")}
      />
    </div>
  `;
}
