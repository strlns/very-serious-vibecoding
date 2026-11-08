import { useEffect, useRef } from "react";
import { ignoredKey } from "./shortcuts.mjs";

export default function useShortcuts(handler) {
  const current = useRef(handler);
  current.current = handler;
  useEffect(() => {
    const key = (e) => {
      if (!ignoredKey(e) && current.current(e)) e.preventDefault();
    };
    // Capture before focused controls/React handlers and cancel browser defaults.
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, []);
}
