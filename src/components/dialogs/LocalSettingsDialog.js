import { html } from "../../lib.js";

export function LocalSettingsDialog({ t, isOpen, values, status, onChange, onClose, onClearKeys, onSave }) {
  if (!isOpen) return null;
  return html`
    <div className="modal-overlay" onClick=${onClose}>
      <dialog open onClick=${(e) => e.stopPropagation()}>
        <form method="dialog" onSubmit=${(e) => { e.preventDefault(); onSave(); }}>
          <h3>${t("local_settings_title")}</h3>
          <p className="sidebar-note">${t("local_settings_note")}</p>
          <label>
            ${t("app_language")}
            <select value=${values.uiLanguage} onChange=${(e) => onChange({ ...values, uiLanguage: e.target.value })}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
          <label>
            ${t("translation_provider")}
            <select value=${values.mtProvider} onChange=${(e) => onChange({ ...values, mtProvider: e.target.value })}>
              <option value="none">${t("provider_none")}</option>
              <option value="mymemory">${t("provider_mymemory")}</option>
              <option value="google">${t("provider_google")}</option>
            </select>
          </label>
          <label>
            ${t("google_api_key")}
            <input type="password" value=${values.googleApiKey} placeholder="AIza..." autoComplete="off" onInput=${(e) => onChange({ ...values, googleApiKey: e.target.value })} />
          </label>
          <label>
            ${t("mymemory_email")}
            <input type="email" value=${values.myMemoryEmail} placeholder="you@example.com" autoComplete="off" onInput=${(e) => onChange({ ...values, myMemoryEmail: e.target.value })} />
          </label>
          <p className="sidebar-note">${status || t("local_settings_local_notice")}</p>
          <menu>
            <button type="button" onClick=${onClose}>${t("close")}</button>
            <button type="button" onClick=${onClearKeys}>${t("clear_keys")}</button>
            <button type="submit">${t("save_settings")}</button>
          </menu>
        </form>
      </dialog>
    </div>
  `;
}
