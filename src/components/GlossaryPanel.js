import { html } from "../lib.js";

export function GlossaryPanel({ t, entries, onAddEntry }) {
  return html`
    <aside className="panel glossary-panel">
      <h2>${t("glossary")}</h2>
      <button id="add-glossary-btn" type="button" onClick=${onAddEntry}>${t("add_entry")}</button>
      <p className="sidebar-note">${t("glossary_help")}</p>
      <ul className="glossary-list">
        ${entries.length
          ? entries.map((entry) => html`<li key=${entry.targetTerm}><strong>${entry.targetTerm}</strong><span>${entry.translation}</span></li>`)
          : html`<li>${t("glossary_no_entries")}</li>`}
      </ul>
    </aside>
  `;
}
