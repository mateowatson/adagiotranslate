import { html } from "../../lib.js";

export function GlossaryDialog({ t, isOpen, values, onChange, onClose, onSubmit }) {
  if (!isOpen) return null;
  return html`
    <div className="modal-overlay" onClick=${onClose}>
      <dialog open onClick=${(e) => e.stopPropagation()}>
        <form method="dialog" onSubmit=${(e) => { e.preventDefault(); onSubmit(); }}>
          <h3>${t("add_glossary_entry")}</h3>
          <label>
            ${t("target_term")}
            <input value=${values.targetTerm} onInput=${(e) => onChange({ ...values, targetTerm: e.target.value })} required />
          </label>
          <label>
            ${t("translation_meaning")}
            <input value=${values.translation} onInput=${(e) => onChange({ ...values, translation: e.target.value })} required />
          </label>
          <menu>
            <button type="button" onClick=${onClose}>${t("cancel")}</button>
            <button type="submit">${t("add")}</button>
          </menu>
        </form>
      </dialog>
    </div>
  `;
}
