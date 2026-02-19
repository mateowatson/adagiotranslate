import { html } from "../../lib.js";

export function ProjectSetupDialog({ t, isOpen, values, languageOptions, onClose, onChange, onSubmit }) {
  if (!isOpen) return null;
  return html`
    <div className="modal-overlay" onClick=${onClose}>
      <dialog open onClick=${(e) => e.stopPropagation()}>
        <form method="dialog" onSubmit=${(e) => { e.preventDefault(); onSubmit(); }}>
          <h3>${t("project_setup")}</h3>
          <label>
            ${t("source_language")}
            <select value=${values.sourceLanguage} onChange=${(e) => onChange({ ...values, sourceLanguage: e.target.value })} required>
              <option value="">${t("select_source_language")}</option>
              ${languageOptions.map((item) => html`<option value=${item.code}>${item.label}</option>`)}
            </select>
          </label>
          <label>
            ${t("target_language")}
            <select value=${values.targetLanguage} onChange=${(e) => onChange({ ...values, targetLanguage: e.target.value })} required>
              <option value="">${t("select_target_language")}</option>
              ${languageOptions.map((item) => html`<option value=${item.code}>${item.label}</option>`)}
            </select>
          </label>
          <label>
            ${t("split_method")}
            <select value=${values.splitMode} onChange=${(e) => onChange({ ...values, splitMode: e.target.value })}>
              <option value="sentence">${t("sentence")}</option>
              <option value="paragraph">${t("paragraph")}</option>
            </select>
          </label>
          <menu>
            <button type="button" onClick=${onClose}>${t("cancel")}</button>
            <button type="submit">${t("continue")}</button>
          </menu>
        </form>
      </dialog>
    </div>
  `;
}
