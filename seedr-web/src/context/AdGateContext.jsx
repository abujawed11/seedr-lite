import { useCallback, useState } from "react";
import AdGateModal from "../components/AdGateModal";
import { AdGateContext } from "./adGate";

// Wrap file-related UI with this. Components call
//   openAdGate({ path, kind, name, action, onReady })   (see ./adGate.js)
// and `onReady(url)` runs inside the user's click on the final button, so
// downloads, new tabs and clipboard writes aren't blocked by the browser.
export function AdGateProvider({ children }) {
  const [request, setRequest] = useState(null);

  const openAdGate = useCallback((opts) => setRequest({ ...opts, id: Date.now() }), []);
  const close = useCallback(() => setRequest(null), []);

  return (
    <AdGateContext.Provider value={openAdGate}>
      {children}
      {request && (
        <AdGateModal
          key={request.id}
          path={request.path}
          kind={request.kind}
          name={request.name}
          action={request.action}
          onClose={close}
          onReady={(url) => {
            setRequest(null);
            request.onReady(url);
          }}
        />
      )}
    </AdGateContext.Provider>
  );
}
