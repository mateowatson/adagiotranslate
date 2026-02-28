import MarkdownIt from "https://esm.sh/markdown-it@14.1.0";
import DOMPurify from "https://esm.sh/dompurify@3.1.6";

const md = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: true,
  typographer: false,
});

export function renderMarkdownToHtml(text) {
  const raw = md.render(String(text || ""));
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
