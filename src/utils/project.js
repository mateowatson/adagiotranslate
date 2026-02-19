export function createEmptyProject() {
  return {
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
  };
}

export function sanitizeFilename(name) {
  return String(name || "adagio-project")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "adagio-project";
}

export function stripExtension(filename) {
  return String(filename || "").replace(/\.[^./]+$/, "");
}

export function splitByParagraph(text) {
  return String(text || "")
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((source, paragraphIndex) => ({ source, paragraphIndex }));
}

export function splitSentencesFromText(text) {
  const normalized = String(text || "").replace(/\n+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  const parts = normalized.match(/[^.!?。！？]+[.!?。！？]?/g) || [normalized];
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function isMarkdownListBlock(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return false;
  }
  return lines.every((line) => /^([-*+]|\d+\.)\s+/.test(line));
}

export function splitMarkdownListItems(text) {
  const lines = String(text || "").split(/\r?\n/);
  const items = [];
  let current = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (/^([-*+]|\d+\.)\s+/.test(trimmed)) {
      if (current.length) {
        items.push(current.join("\n").trim());
      }
      current = [trimmed];
      return;
    }

    if (current.length) {
      current.push(trimmed);
    } else {
      current = [trimmed];
    }
  });

  if (current.length) {
    items.push(current.join("\n").trim());
  }

  return items.filter(Boolean);
}

export function splitBySentence(text) {
  const paragraphs = String(text || "")
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return [];
  }

  const segments = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (isMarkdownListBlock(paragraph)) {
      const listItems = splitMarkdownListItems(paragraph);
      listItems.forEach((item) => segments.push({ source: item, paragraphIndex }));
      return;
    }
    const parts = splitSentencesFromText(paragraph);
    parts.forEach((source) => segments.push({ source, paragraphIndex }));
  });

  return segments;
}

export function segmentSourceText(text, splitMode = "sentence") {
  const rawSegments = splitMode === "paragraph" ? splitByParagraph(text) : splitBySentence(text);
  return rawSegments.map((segmentData, index) => ({
    id: `seg-${index + 1}`,
    source: segmentData.source,
    translation: "",
    index,
    paragraphIndex: segmentData.paragraphIndex,
  }));
}

export function rebuildSourceText(segments, splitMode = "sentence") {
  const delimiter = splitMode === "paragraph" ? "\n\n" : " ";
  return (segments || [])
    .map((segment) => segment.source || "")
    .filter(Boolean)
    .join(delimiter);
}

export function normalizeProjectData(parsed, fallbackName = "") {
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
      paragraphIndex: Number.isInteger(segment.paragraphIndex)
        ? segment.paragraphIndex
        : (parsed.meta.splitMode === "paragraph" ? index : 0),
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

export function serializeProject(project) {
  return JSON.stringify(
    {
      meta: {
        ...project.meta,
        editorPosition: project.meta.editorPosition,
      },
      sourceText: project.sourceText,
      segments: project.segments.map((segment) => ({
        id: segment.id,
        source: segment.source,
        translation: segment.translation,
        paragraphIndex: segment.paragraphIndex,
      })),
      glossary: project.glossary,
    },
    null,
    2
  );
}

export function getRelevantGlossaryEntries(project, activeSegmentId) {
  const segment = project.segments.find((item) => item.id === activeSegmentId);
  if (!segment) return [];
  const sourceText = (segment.source || "").toLowerCase();
  return project.glossary.filter((item) => sourceText.includes(item.targetTerm.toLowerCase()));
}

export function upsertGlossaryEntry(project, entry) {
  const existing = project.glossary.find(
    (item) => item.targetTerm.toLowerCase() === entry.targetTerm.toLowerCase()
  );
  if (existing) {
    existing.translation = entry.translation;
    existing.updatedAt = new Date().toISOString();
    return;
  }
  project.glossary.push(entry);
}

export function getExportSegments(project) {
  return project.segments
    .map((segment) => {
      const translated = (segment.translation || "").trim();
      const source = (segment.source || "").trim();
      const text = translated || source;
      return {
        ...segment,
        exportText: text,
      };
    })
    .filter((segment) => segment.exportText);
}

export function resolveExportJoiner(project, segment) {
  if (project.meta.splitMode !== "sentence") {
    return "\n";
  }
  const sourceLooksLikeList = isMarkdownListBlock(segment?.source || "");
  const exportLooksLikeList = isMarkdownListBlock(segment?.exportText || "");
  return sourceLooksLikeList || exportLooksLikeList ? "\n" : " ";
}

export function getExportParagraphs(project) {
  const segments = getExportSegments(project);
  if (!segments.length) return [];

  const grouped = [];
  let currentParagraphIndex = null;
  let currentTexts = [];
  let currentJoiner = project.meta.splitMode === "sentence" ? " " : "\n";

  segments.forEach((segment, fallbackIndex) => {
    const paragraphIndex = Number.isInteger(segment.paragraphIndex)
      ? segment.paragraphIndex
      : (project.meta.splitMode === "sentence" ? 0 : fallbackIndex);

    if (currentParagraphIndex === null) {
      currentParagraphIndex = paragraphIndex;
      currentJoiner = resolveExportJoiner(project, segment);
    }

    if (paragraphIndex !== currentParagraphIndex) {
      if (currentTexts.length) grouped.push(currentTexts.join(currentJoiner).trim());
      currentParagraphIndex = paragraphIndex;
      currentTexts = [];
      currentJoiner = resolveExportJoiner(project, segment);
    }

    if (resolveExportJoiner(project, segment) === "\n") {
      currentJoiner = "\n";
    }

    currentTexts.push(segment.exportText);
  });

  if (currentTexts.length) grouped.push(currentTexts.join(currentJoiner).trim());
  return grouped.filter(Boolean);
}
