import { html } from "../../lib.js";

export function GlossaryMatchesDialog({ t, isOpen, entries, onClose }) {
  if (!isOpen) return null;
  return html`
    <div className="modal-overlay" onClick=${onClose}>
      <dialog open onClick=${(e) => e.stopPropagation()}>
        <form method="dialog">
          <h3>${t("glossary_matches")}</h3>
          <ul className="glossary-list">
            ${entries.length
              ? entries.map((entry) => html`<li key=${entry.targetTerm}><strong>${entry.targetTerm}</strong><span>${entry.translation}</span></li>`)
              : html`<li>${t("glossary_no_matches")}</li>`}
          </ul>
          <menu>
            <button type="button" onClick=${onClose}>${t("close")}</button>
          </menu>
        </form>
      </dialog>
    </div>
  `;
}
