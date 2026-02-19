import {
  GOOGLE_API_KEY_STORAGE_KEY,
  LOCAL_STORAGE_KEY,
  MT_PROVIDER_STORAGE_KEY,
  MYMEMORY_EMAIL_STORAGE_KEY,
  UI_LANGUAGE_STORAGE_KEY,
} from "../constants.js";
import { normalizeProjectData } from "./project.js";

export function persistProject(project, activeSegmentId) {
  const payload = {
    project: {
      meta: { ...project.meta },
      sourceText: project.sourceText,
      segments: project.segments.map((segment) => ({
        id: segment.id,
        source: segment.source,
        translation: segment.translation,
        paragraphIndex: segment.paragraphIndex,
      })),
      glossary: project.glossary.map((entry) => ({
        targetTerm: entry.targetTerm,
        translation: entry.translation,
        addedAt: entry.addedAt || null,
        updatedAt: entry.updatedAt || null,
      })),
    },
    activeSegmentId,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

export function loadProject() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const storedProject = parsed && parsed.project ? parsed.project : parsed;
    const project = normalizeProjectData(storedProject, "");
    const preferredSegmentId = parsed && typeof parsed.activeSegmentId === "string" ? parsed.activeSegmentId : null;
    const hasPreferred = preferredSegmentId && project.segments.some((segment) => segment.id === preferredSegmentId);
    return {
      project,
      activeSegmentId: hasPreferred ? preferredSegmentId : (project.segments[0]?.id || null),
    };
  } catch (error) {
    console.warn("Could not load project from local storage. Starting fresh.", error);
    return null;
  }
}

export function loadLocalSettings() {
  return {
    uiLanguage: (localStorage.getItem(UI_LANGUAGE_STORAGE_KEY) || "").trim().toLowerCase(),
    mtProvider: (localStorage.getItem(MT_PROVIDER_STORAGE_KEY) || "mymemory").trim().toLowerCase(),
    googleApiKey: localStorage.getItem(GOOGLE_API_KEY_STORAGE_KEY) || "",
    myMemoryEmail: localStorage.getItem(MYMEMORY_EMAIL_STORAGE_KEY) || "",
  };
}

export function saveLocalSettings({ uiLanguage, mtProvider, googleApiKey, myMemoryEmail }) {
  localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, uiLanguage || "en");
  localStorage.setItem(MT_PROVIDER_STORAGE_KEY, mtProvider || "none");
  localStorage.setItem(GOOGLE_API_KEY_STORAGE_KEY, googleApiKey || "");
  localStorage.setItem(MYMEMORY_EMAIL_STORAGE_KEY, myMemoryEmail || "");
}

export function clearApiKeys() {
  localStorage.removeItem(GOOGLE_API_KEY_STORAGE_KEY);
  localStorage.removeItem(MYMEMORY_EMAIL_STORAGE_KEY);
}
