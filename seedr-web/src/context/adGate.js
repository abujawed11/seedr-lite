import { createContext, useContext } from "react";

export const AdGateContext = createContext(null);

// openAdGate({ path, kind: 'stream'|'download'|'folder', name, action: 'play'|'download'|'copy', onReady(url) })
export function useAdGate() {
  const ctx = useContext(AdGateContext);
  if (!ctx) throw new Error("useAdGate must be used inside <AdGateProvider>");
  return ctx;
}

// Start a download without navigating away from the app.
export function triggerDownload(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
