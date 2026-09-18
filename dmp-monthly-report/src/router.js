import { useEffect, useState } from "react";

// Minimal client-side router — no library. The DMP report still switches pages
// via `activeId` in App.jsx; this distinguishes the /allcompany area (and its
// sub-pages) from the default shell, and keeps the URL / back-button in sync.

const EVENT = "dmp:navigate";

export function navigate(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event(EVENT));
}

export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);
  return path;
}

// True for "/allcompany", "/allcompany/", or "/allcompany/<slug>".
export function isAllCompanyPath(path) {
  return /^\/allcompany(\/|$)/i.test(path);
}

// Returns the sub-page slug ("" for the base path).
export function allCompanySlug(path) {
  const m = path.match(/^\/allcompany\/([^/]+)\/?$/i);
  return m ? m[1].toLowerCase() : "";
}
