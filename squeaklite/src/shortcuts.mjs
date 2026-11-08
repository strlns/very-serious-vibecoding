// Match characters for layout-dependent shortcuts; Enter also accepts a keypad.
export const commandEnter = (e) =>
  (e.metaKey || e.ctrlKey) &&
  !e.altKey &&
  !e.shiftKey &&
  (e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter");
export const plainCharacter = (e) => !e.metaKey && !e.ctrlKey && !e.altKey;
export function textEntry(e) {
  const target = e.composedPath?.()[0] || e.target;
  return [target, globalThis.document?.activeElement].some(
    (el) =>
      el?.isContentEditable ||
      el?.closest?.(
        'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
      ),
  );
}
export const ignoredKey = (e) =>
  e.defaultPrevented || e.repeat || e.isComposing || e.keyCode === 229;
export function shortcutLabels(nav = globalThis.navigator) {
  const mac = /Mac|iPhone|iPad|iPod/i.test(
    nav?.userAgentData?.platform || nav?.platform || "",
  );
  return {
    run: mac ? "⌘ Enter" : "Ctrl Enter",
    ariaRun: mac ? "Meta+Enter" : "Control+Enter",
  };
}
