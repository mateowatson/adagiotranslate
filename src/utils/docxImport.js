export function isDocxFile(file) {
  const name = (file?.name || "").toLowerCase();
  return (
    name.endsWith(".docx")
    || file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export function stripImagesFromMarkdown(markdown) {
  if (!markdown) return "";
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

export async function readDocxAsMarkdown(file) {
  const mammothLib = window.mammoth;
  if (!mammothLib) return "";

  const buffer = await file.arrayBuffer();

  try {
    const markdownResult = await mammothLib.convertToMarkdown({ arrayBuffer: buffer });
    const markdownText = stripImagesFromMarkdown((markdownResult?.value || "").trim());
    if (markdownText) return markdownText;
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

export async function readTextFromFile(file) {
  if (isDocxFile(file)) {
    const docxText = await readDocxAsMarkdown(file);
    if (docxText && docxText.trim()) return docxText;
  }

  const asText = await file.text();
  if (asText && asText.trim()) return asText;

  const buffer = await file.arrayBuffer();
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}
