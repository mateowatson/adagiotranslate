import MarkdownIt from "https://esm.sh/markdown-it@14.1.0";
import DOMPurify from "https://esm.sh/dompurify@3.1.6";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});

const defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const targetIndex = token.attrIndex("target");
  if (targetIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else {
    token.attrs[targetIndex][1] = "_blank";
  }

  const relIndex = token.attrIndex("rel");
  if (relIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  } else {
    token.attrs[relIndex][1] = "noopener noreferrer";
  }

  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderMarkdownToHtml(text) {
  const raw = md.render(String(text || ""));
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}
