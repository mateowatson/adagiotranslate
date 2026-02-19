import { React, html } from "../lib.js";

const { useEffect, useState } = React;

function isVisible(node) {
  if (!(node instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return node.getClientRects().length > 0;
}

function resolveTarget(targets) {
  const selectors = Array.isArray(targets) ? targets : [targets];
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node && isVisible(node)) return node;
  }
  return null;
}

export function OnboardingTour({
  t,
  active,
  step,
  stepIndex,
  total,
  copy,
  onBack,
  onNext,
  onSkip,
}) {
  const [position, setPosition] = useState({ top: 16, left: 16 });

  const targetNode = active && step ? resolveTarget(step.targets) : null;

  useEffect(() => {
    if (!active || !step) return;

    const updatePosition = () => {
      const margin = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popover = document.querySelector(".onboarding-popover");
      const target = resolveTarget(step.targets);

      if (!popover || !target) {
        const centeredTop = Math.max(margin, Math.floor((viewportHeight - 220) / 2));
        const centeredLeft = Math.max(margin, Math.floor((viewportWidth - 320) / 2));
        setPosition({ top: centeredTop, left: centeredLeft });
        return;
      }

      const popRect = popover.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const roomRight = viewportWidth - rect.right;
      const roomLeft = rect.left;
      const placeRight = roomRight >= popRect.width + margin;
      const placeLeft = roomLeft >= popRect.width + margin;

      let top;
      let left;
      if (placeRight) {
        left = rect.right + margin;
        top = rect.top;
      } else if (placeLeft) {
        left = rect.left - popRect.width - margin;
        top = rect.top;
      } else {
        left = Math.max(margin, Math.min(rect.left, viewportWidth - popRect.width - margin));
        top = rect.bottom + margin;
      }

      top = Math.max(margin, Math.min(top, viewportHeight - popRect.height - margin));
      left = Math.max(margin, Math.min(left, viewportWidth - popRect.width - margin));
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [active, step]);

  useEffect(() => {
    if (!active) return undefined;
    if (!targetNode) return undefined;
    targetNode.classList.add("onboarding-highlight");
    return () => {
      targetNode.classList.remove("onboarding-highlight");
    };
  }, [active, targetNode]);

  if (!active || !step) return null;

  return html`
    <${React.Fragment}>
      <div className="onboarding-overlay"></div>
      <div className="onboarding-popover" style=${{ top: `${position.top}px`, left: `${position.left}px` }}>
        <div className="onboarding-header">${t("onboarding_header")}</div>
        <div className="onboarding-step">${t("onboarding_step_counter", { current: stepIndex + 1, total })}</div>
        <h4 className="onboarding-title">${copy?.title || step.id}</h4>
        <p className="onboarding-body">${copy?.body || ""}</p>
        <div className="onboarding-actions">
          <button type="button" onClick=${onBack} disabled=${stepIndex === 0}>${t("onboarding_back")}</button>
          <button type="button" onClick=${onNext}>${stepIndex === total - 1 ? t("onboarding_finish") : t("onboarding_next")}</button>
          <button type="button" onClick=${onSkip}>${t("onboarding_skip")}</button>
        </div>
      </div>
    <//>
  `;
}
