import { getExportParagraphs, sanitizeFilename } from "./project.js";

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(filename, text, mimeType = "text/plain") {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  downloadBlob(filename, blob);
}

export function markdownInlineToTextRuns(text, TextRun) {
  const runs = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`)/g;
  let cursor = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > cursor) {
      runs.push(new TextRun({ text: text.slice(cursor, match.index) }));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else if (token.startsWith("*") && token.endsWith("*")) {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      runs.push(new TextRun({ text: token.slice(2, -2), strike: true }));
    } else if (token.startsWith("`") && token.endsWith("`")) {
      runs.push(new TextRun({ text: token.slice(1, -1), font: "Courier New" }));
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    runs.push(new TextRun({ text: text.slice(cursor) }));
  }

  return runs.length ? runs : [new TextRun({ text })];
}

export function markdownToDocxParagraphs(markdown, Paragraph, TextRun, HeadingLevel) {
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
      paragraphs.push(new Paragraph({
        heading: headingMap[Math.min(level, 6)] || HeadingLevel.HEADING_1,
        children: markdownInlineToTextRuns(headingMatch[2], TextRun),
      }));
      return;
    }

    const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ulMatch) {
      paragraphs.push(new Paragraph({
        text: "",
        numbering: { reference: "adagio-ul", level: 0 },
        children: markdownInlineToTextRuns(ulMatch[1], TextRun),
      }));
      return;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      paragraphs.push(new Paragraph({
        text: "",
        numbering: { reference: "adagio-ol", level: 0 },
        children: markdownInlineToTextRuns(olMatch[1], TextRun),
      }));
      return;
    }

    paragraphs.push(new Paragraph({
      children: markdownInlineToTextRuns(line, TextRun),
    }));
  });

  return paragraphs;
}

export function exportTargetAsMarkdown(project, projectName, sourceLabel, targetLabel) {
  const exportParagraphs = getExportParagraphs(project);
  if (!exportParagraphs.length) {
    return { ok: false };
  }

  const heading = [
    `# ${projectName || "Adagio Translate Export"}`,
    "",
    `- Source language: ${sourceLabel || "Unknown"}`,
    `- Target language: ${targetLabel || "Unknown"}`,
    "",
    "---",
    "",
  ].join("\n");

  const body = exportParagraphs.join("\n\n");
  const markdown = `${heading}${body}\n`;

  downloadTextFile(
    `${sanitizeFilename(project.meta.name || "adagio-project")}-target.md`,
    markdown,
    "text/markdown"
  );

  return { ok: true };
}

export async function exportTargetAsDocx(project) {
  const exportParagraphs = getExportParagraphs(project);
  if (!exportParagraphs.length) {
    return { ok: false, reason: "empty" };
  }

  if (!window.docx) {
    return { ok: false, reason: "lib" };
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
  const projectTitle = project.meta.name || "Adagio Translate Export";

  const paragraphs = [
    new Paragraph({
      children: [new TextRun({ text: projectTitle, bold: true, size: 30 })],
      spacing: { after: 240 },
    }),
  ];

  exportParagraphs.forEach((paragraphText, index) => {
    const segmentParagraphs = markdownToDocxParagraphs(paragraphText, Paragraph, TextRun, HeadingLevel);
    paragraphs.push(...segmentParagraphs);
    if (index < exportParagraphs.length - 1) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }));
    }
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "adagio-ul",
          levels: [{
            level: 0,
            format: "bullet",
            text: "•",
            alignment: "left",
            style: { paragraph: { indent: { left: 720, hanging: 260 } } },
          }],
        },
        {
          reference: "adagio-ol",
          levels: [{
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: "left",
            style: { paragraph: { indent: { left: 720, hanging: 260 } } },
          }],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    downloadBlob(`${sanitizeFilename(project.meta.name || "adagio-project")}-target.docx`, blob);
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, reason: "pack" };
  }
}
