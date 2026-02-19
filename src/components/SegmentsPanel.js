import { html } from "../lib.js";

function SegmentItem({
  t,
  segment,
  idx,
  isActive,
  targetLanguageLabel,
  showAutoTranslate,
  compact,
  glossaryEntries,
  onSelect,
  onChangeTranslation,
  onAutoTranslate,
  onAddGlossary,
  onViewGlossaryMatches,
  isTranslating,
  mtStatus,
}) {
  const translationStatus = (segment.translation || "").trim() ? t("status_translated") : t("status_pending");
  const summary = glossaryEntries.length
    ? glossaryEntries.map((entry) => `${entry.targetTerm} = ${entry.translation}`).join(" | ")
    : `${t("glossary_summary_prefix")}: ${t("glossary_no_matches").toLowerCase()}`;

  return html`
    <li className=${`segment-item ${isActive ? "active" : ""}`} data-segment-id=${segment.id} title=${`${t("status_prefix")}: ${translationStatus}`} onClick=${() => onSelect(segment.id)}>
      <div className="segment-content">
        <div className="segment-source">${idx + 1}. ${segment.source}</div>

        ${isActive ? html`
          <div className="segment-edit-block" onClick=${(e) => e.stopPropagation()}>
            <div className="segment-edit-actions">
              <label className="segment-edit-label">${targetLanguageLabel || t("target_language")} ${t("target_translation")}</label>
              ${showAutoTranslate ? html`
                <button
                  type="button"
                  className="segment-auto-translate-btn"
                  onClick=${() => onAutoTranslate(segment.id)}
                  disabled=${isTranslating}
                >
                  ${isTranslating ? t("translating") : t("auto_translate_segment")}
                </button>
              ` : null}
            </div>

            ${mtStatus ? html`<p className="sidebar-note">${mtStatus}</p>` : null}

            ${compact ? html`
              <div className="segment-inline-glossary">
                <div className="segment-inline-glossary-header">
                  <span className="segment-inline-glossary-text" title=${t("view_all_glossary_matches")} onClick=${onViewGlossaryMatches}>
                    ${glossaryEntries.length ? `${t("glossary_summary_prefix")}: ${summary}` : summary}
                  </span>
                  <button type="button" className="segment-add-glossary-btn" onClick=${onAddGlossary}>${t("add_entry")}</button>
                </div>
              </div>
            ` : null}

            <textarea
              className="segment-translation-input"
              placeholder=${t("write_translation_here")}
              value=${segment.translation || ""}
              onInput=${(e) => onChangeTranslation(segment.id, e.target.value)}
            />
          </div>
        ` : null}
      </div>
    </li>
  `;
}

export function SegmentsPanel({
  t,
  segments,
  activeSegmentId,
  targetLanguageLabel,
  segmentCountText,
  compact,
  isMtConfigured,
  getGlossaryEntriesForSegment,
  onResegment,
  onSelectSegment,
  onChangeTranslation,
  onAutoTranslate,
  onAddGlossary,
  onViewGlossaryMatches,
  translatingSegmentId,
  mtStatusBySegmentId,
}) {
  return html`
    <section className="panel segments-panel">
      <h2>${t("segments")}</h2>
      <div className="segment-controls">
        <button onClick=${onResegment}>${t("resegment")}</button>
        <span>${segmentCountText}</span>
      </div>
      <p className="sidebar-note">${t("segments_help")}</p>
      <ol id="segment-list" className="segment-list">
        ${segments.map((segment, idx) => html`
          <${SegmentItem}
            key=${segment.id}
            t=${t}
            segment=${segment}
            idx=${idx}
            isActive=${segment.id === activeSegmentId}
            targetLanguageLabel=${targetLanguageLabel}
            showAutoTranslate=${isMtConfigured}
            compact=${compact}
            glossaryEntries=${getGlossaryEntriesForSegment(segment.id)}
            onSelect=${onSelectSegment}
            onChangeTranslation=${onChangeTranslation}
            onAutoTranslate=${onAutoTranslate}
            onAddGlossary=${() => onAddGlossary(segment.id)}
            onViewGlossaryMatches=${() => onViewGlossaryMatches(segment.id)}
            isTranslating=${translatingSegmentId === segment.id}
            mtStatus=${mtStatusBySegmentId[segment.id] || ""}
          />
        `)}
      </ol>
    </section>
  `;
}
