import { React, html } from "../lib.js";

export function Header({ t, projectMetaText, splitMode, editorPosition, onSplitModeChange, onEditorPositionChange, onAction, onEditAction }) {
  const { useEffect, useRef, useState } = React;
  const [openMenu, setOpenMenu] = useState(null);
  const menuBarRef = useRef(null);

  function closeMenus() {
    setOpenMenu(null);
  }

  function onSummaryClick(menuId, event) {
    event.preventDefault();
    setOpenMenu((prev) => (prev === menuId ? null : menuId));
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuBarRef.current) return;
      if (!menuBarRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return html`
    <header className="app-header">
      <div className="brand" aria-label="Adagio Translate">
        <span className="brand-mark" aria-hidden="true">
          <svg className="brand-note" viewBox="0 0 24 24" role="img" aria-hidden="true">
            <title>Musical note</title>
            <ellipse cx="8.3" cy="17.2" rx="3.6" ry="2.7" fill="currentColor" />
            <rect x="11.1" y="5.1" width="2.4" height="12.1" rx="1.2" fill="currentColor" />
            <path d="M13.4 5.4c3-.1 4.7.6 6.1 2.6c.5.8 0 1.8-1 1.8c-.4 0-.8-.2-1-.5c-.8-1.1-1.8-1.5-4.1-1.4z" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-text">${t("app_title")}</span>
      </div>

      <nav className="menu-bar" aria-label="Application menu" ref=${menuBarRef}>
        <details className="menu" id="menu-file" open=${openMenu === "file"}>
          <summary onClick=${(e) => onSummaryClick("file", e)}>${t("menu_file")}</summary>
          <div className="menu-items" role="menu">
            <button onClick=${() => { closeMenus(); onAction("new"); }}>${t("new_project")}</button>
            <button onClick=${() => { closeMenus(); onAction("import"); }}>${t("import_document")}</button>
            <button onClick=${() => { closeMenus(); onAction("open"); }}>${t("open_project")}</button>
            <button onClick=${() => { closeMenus(); onAction("save"); }}>${t("save_project")}</button>
            <button onClick=${() => { closeMenus(); onAction("saveAs"); }}>${t("save_project_as")}</button>
            <button onClick=${() => { closeMenus(); onAction("exportMd"); }}>${t("export_md")}</button>
            <button onClick=${() => { closeMenus(); onAction("exportDocx"); }}>${t("export_docx")}</button>
          </div>
        </details>

        <details className="menu" id="menu-edit" open=${openMenu === "edit"}>
          <summary onClick=${(e) => onSummaryClick("edit", e)}>${t("menu_edit")}</summary>
          <div className="menu-items" role="menu">
            <button onClick=${() => { closeMenus(); onEditAction("undo"); }}>${t("undo")}</button>
            <button onClick=${() => { closeMenus(); onEditAction("redo"); }}>${t("redo")}</button>
            <button onClick=${() => { closeMenus(); onEditAction("cut"); }}>${t("cut")}</button>
            <button onClick=${() => { closeMenus(); onEditAction("copy"); }}>${t("copy")}</button>
            <button onClick=${() => { closeMenus(); onEditAction("paste"); }}>${t("paste")}</button>
            <button onClick=${() => { closeMenus(); onEditAction("selectAll"); }}>${t("select_all")}</button>
          </div>
        </details>

        <details className="menu" id="menu-view" open=${openMenu === "view"}>
          <summary onClick=${(e) => onSummaryClick("view", e)}>${t("menu_view")}</summary>
          <div className="menu-items" role="menu">
            <label>
              <span>${t("split_mode")}</span>
              <select value=${splitMode} onChange=${(e) => { onSplitModeChange(e.target.value); closeMenus(); }}>
                <option value="sentence">${t("sentence")}</option>
                <option value="paragraph">${t("paragraph")}</option>
              </select>
            </label>
            <label>
              <span>${t("editor_position")}</span>
              <select value=${editorPosition} onChange=${(e) => { onEditorPositionChange(e.target.value); closeMenus(); }}>
                <option value="bottom">${t("bottom")}</option>
                <option value="right">${t("right")}</option>
              </select>
            </label>
          </div>
        </details>

        <button id="local-settings-btn" className="menu-launcher" type="button" onClick=${() => { closeMenus(); onAction("localSettings"); }}>${t("local_settings")}</button>
      </nav>

      <a
        id="fork-github-link"
        className="github-fork-link"
        href="https://github.com/mateowatson/adagiotranslate"
        target="_blank"
        rel="noopener noreferrer"
        aria-label=${t("fork_github")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.426 2.865 8.18 6.839 9.504c.5.092.682-.217.682-.483c0-.237-.009-.866-.014-1.7c-2.782.605-3.369-1.344-3.369-1.344c-.454-1.157-1.11-1.466-1.11-1.466c-.908-.62.069-.608.069-.608c1.004.07 1.532 1.033 1.532 1.033c.893 1.533 2.341 1.09 2.91.833c.091-.647.35-1.09.636-1.34c-2.22-.253-4.555-1.113-4.555-4.95c0-1.093.39-1.988 1.029-2.688c-.103-.253-.446-1.272.098-2.65c0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.54 9.54 0 0 1 2.504.337c1.909-1.296 2.748-1.026 2.748-1.026c.546 1.379.202 2.398.1 2.65c.64.7 1.028 1.595 1.028 2.688c0 3.846-2.338 4.694-4.566 4.943c.36.31.68.92.68 1.855c0 1.338-.012 2.419-.012 2.747c0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.523 2 12 2Z" fill="currentColor" />
        </svg>
        <span id="fork-github-label">${t("fork_github")}</span>
      </a>

      <div className="project-meta">${projectMetaText}</div>
    </header>
  `;
}
