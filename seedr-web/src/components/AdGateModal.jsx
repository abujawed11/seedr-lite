import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startAdGate, completeAdGate } from "../api";
import { GATE_AD } from "../utils/adConfig";
import { openSmartlink } from "../utils/smartlink";

// Loaded inside its own iframe, so it can reuse the page banner's unit
// without a container-id clash (see utils/adConfig.js).
const AD_SCRIPT_URL = GATE_AD.scriptUrl;
const AD_CONTAINER_ID = GATE_AD.containerId;

const ACTION_LABELS = {
  play: { icon: "▶", text: "Play now", verb: "playback" },
  download: { icon: "⬇", text: "Download now", verb: "download" },
  copy: { icon: "🔗", text: "Copy link", verb: "link" },
};

function buildAdDoc(nonce) {
  // Runs inside the iframe. Reports 'loaded' | 'nofill' | 'blocked' to the parent.
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent;color:#d1d5db;font-family:system-ui,sans-serif;overflow:hidden}</style>
</head><body>
<div id=${JSON.stringify(AD_CONTAINER_ID)}></div>
<script>
(function(){
  var sent=false;
  function send(s){ if(sent) return; sent=true; parent.postMessage({ adGate: ${JSON.stringify(nonce)}, status: s }, "*"); }

  // The ad script failed. That can be an ad blocker OR the ad network being
  // down / misconfigured. Tell them apart with a bait request every blocker
  // (extension, DNS, Brave, Opera...) blocks: if it loads, there's no blocker.
  function diagnose(reason){
    if(sent) return;
    console.warn("[ad-gate] ad script did not load (" + reason + "): " + ${JSON.stringify(AD_SCRIPT_URL)});
    var bait=document.createElement("div");
    bait.className="adsbox ad-banner ad-placement pub_300x250 textads";
    bait.style.cssText="position:absolute;left:-9999px;width:10px;height:10px";
    bait.innerHTML="&nbsp;";
    document.body.appendChild(bait);
    var cosmeticBlocked=bait.offsetHeight===0 || getComputedStyle(bait).display==="none";
    if(cosmeticBlocked){ send("blocked"); return; }
    var done=false;
    var t=setTimeout(function(){ if(!done){ done=true; send("blocked"); } }, 5000);
    fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", { mode: "no-cors", cache: "no-store" })
      .then(function(){ if(done) return; done=true; clearTimeout(t); send("nofill"); })
      .catch(function(){ if(done) return; done=true; clearTimeout(t); send("blocked"); });
  }

  var sc=document.createElement("script");
  sc.async=true; sc.setAttribute("data-cfasync","false");
  sc.src=${JSON.stringify(AD_SCRIPT_URL)};
  sc.onerror=function(){ diagnose("error"); };
  sc.onload=function(){
    setTimeout(function(){
      var c=document.getElementById(${JSON.stringify(AD_CONTAINER_ID)});
      var visible=c && c.children.length>0 && c.offsetHeight>0;
      send(visible ? "loaded" : "nofill");
    }, 2000);
  };
  document.body.appendChild(sc);
  setTimeout(function(){ diagnose("timeout"); }, 12000);
})();
</script></body></html>`;
}

function AdSlot({ onStatus }) {
  const iframeRef = useRef(null);
  const nonce = useMemo(() => Math.random().toString(36).slice(2), []);
  const srcDoc = useMemo(() => buildAdDoc(nonce), [nonce]);

  useEffect(() => {
    function onMessage(e) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || e.data.adGate !== nonce) return;
      onStatus(e.data.status);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nonce, onStatus]);

  return (
    <iframe
      ref={iframeRef}
      title="Advertisement"
      srcDoc={srcDoc}
      className="w-full h-[280px] border-0 bg-transparent"
      scrolling="no"
    />
  );
}

// opensWindow: true when onReady itself opens a new tab (e.g. a PDF). Browsers
// allow only one new tab per click, so the Smartlink is skipped in that case.
export default function AdGateModal({ path, kind, name, action = "download", opensWindow = false, onReady, onClose }) {
  const [phase, setPhase] = useState("starting"); // starting | waiting | finalizing | ready | blocked | error
  const [adStatus, setAdStatus] = useState("loading"); // loading | loaded | nofill | blocked
  const [waitSeconds, setWaitSeconds] = useState(10);
  const [viaAd, setViaAd] = useState(false); // false when a paid user skipped the ad
  const [elapsedMs, setElapsedMs] = useState(0);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0); // bump to restart the whole flow
  const sessionRef = useRef(null);
  const label = ACTION_LABELS[action] || ACTION_LABELS.download;

  // 1. Open an ad session on the server
  useEffect(() => {
    let cancelled = false;
    setPhase("starting");
    setAdStatus("loading");
    setElapsedMs(0);
    setUrl(null);
    setError("");
    setViaAd(false);
    sessionRef.current = null;

    startAdGate(path, kind)
      .then((data) => {
        if (cancelled) return;
        if (data.skip && data.url) {
          setUrl(data.url);
          setPhase("ready");
          return;
        }
        sessionRef.current = data.sessionId;
        setWaitSeconds(data.waitSeconds || 10);
        setViaAd(true);
        setPhase("waiting");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error || "Could not start. Please try again.");
        setPhase("error");
      });

    return () => { cancelled = true; };
  }, [path, kind, attempt]);

  const handleAdStatus = useCallback((status) => {
    setAdStatus(status);
    if (status === "blocked") setPhase((p) => (p === "waiting" ? "blocked" : p));
  }, []);

  // 2. Count down only while the ad is showing and the tab is visible
  const adShowing = adStatus === "loaded" || adStatus === "nofill";
  useEffect(() => {
    if (phase !== "waiting" || !adShowing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      if (document.visibilityState === "visible") setElapsedMs((e) => e + dt);
    }, 200);
    return () => clearInterval(id);
  }, [phase, adShowing]);

  // Track mount state so late responses after closing are ignored
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 3. When the countdown ends, ask the server for the link — exactly once per
  // session (sessions are single-use, and StrictMode runs effects twice).
  const completedSessionRef = useRef(null);
  const countdownDone = phase === "waiting" && elapsedMs >= waitSeconds * 1000;
  useEffect(() => {
    if (!countdownDone) return;
    const sessionId = sessionRef.current;
    if (!sessionId || completedSessionRef.current === sessionId) return;
    completedSessionRef.current = sessionId;
    setPhase("finalizing");

    // Ignore the result if the user closed the modal or restarted the flow
    const stale = () => !mountedRef.current || sessionRef.current !== sessionId;

    const finish = (retries) => {
      completeAdGate(sessionId)
        .then((data) => {
          if (stale()) return;
          setUrl(data.url);
          setPhase("ready");
        })
        .catch((err) => {
          if (stale()) return;
          const retryAfter = err.response?.data?.retryAfterMs;
          if (err.response?.status === 425 && retryAfter && retries > 0) {
            setTimeout(() => finish(retries - 1), retryAfter + 250);
            return;
          }
          setError(
            err.response?.data?.error ||
              (err.response ? "Something went wrong. Please try again." : "Can't reach the server. Please try again.")
          );
          setPhase("error");
        });
    };
    finish(2);
  }, [countdownDone]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remaining = Math.max(0, Math.ceil(waitSeconds - elapsedMs / 1000));
  const progress = Math.min(100, (elapsedMs / (waitSeconds * 1000)) * 100);
  // Keep the ad on screen after the countdown too (ready / done), not just while waiting
  const showAd = viaAd && ["waiting", "finalizing", "blocked", "ready", "done"].includes(phase);

  const handleAction = () => {
    onReady(url); // start the download / player / copy first
    // Free users: open the Smartlink ad tab on this click (cooldown applies)
    if (viaAd && !opensWindow) openSmartlink();
    // Play closes the modal (the player opens); download/copy keep it open with the ad
    if (action !== "play") setPhase("done");
  };

  const handleUpgrade = () => {
    onClose();
    window.dispatchEvent(new Event("showPlansModal"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {phase === "done" ? `Your ${label.verb} is ready` : `Preparing your ${label.verb}`}
            </div>
            <div className="truncate font-medium text-white" title={name}>{name}</div>
          </div>
          <button onClick={onClose} className="ml-4 rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Ad */}
        {showAd && (
          <div className="px-5 pt-4">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">Advertisement</div>
            <div className="relative min-h-[280px] overflow-hidden rounded-lg bg-gray-800/60">
              {phase !== "blocked" && <AdSlot key={attempt} onStatus={handleAdStatus} />}
              {adStatus === "loading" && phase !== "blocked" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                  Loading…
                </div>
              )}
              {adStatus === "nofill" && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-gray-400">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="font-medium text-gray-200">Go ad-free with Premium</div>
                  <div className="text-sm">Instant downloads, no waiting</div>
                </div>
              )}
              {phase === "blocked" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-4xl mb-3">🛡️</div>
                  <div className="text-lg font-semibold text-white">Ad blocker detected</div>
                  <p className="mt-1 max-w-md text-sm text-gray-400">
                    Ads keep the free plan running. Please turn off your ad blocker for this site and try again,
                    or upgrade to remove ads completely.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setAttempt((a) => a + 1)}
                      className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
                    >
                      I've disabled it, retry
                    </button>
                    <button
                      onClick={handleUpgrade}
                      className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:from-yellow-600 hover:to-orange-600"
                    >
                      Upgrade
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status / action */}
        <div className="px-5 py-4">
          {phase === "starting" && <div className="text-center text-sm text-gray-400">Starting…</div>}

          {(phase === "waiting" || phase === "finalizing") && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-center text-sm text-gray-300">
                {phase === "finalizing"
                  ? "Getting your link…"
                  : adShowing
                    ? `Your ${label.verb} will be ready in ${remaining}s`
                    : "Loading ad…"}
              </div>
            </div>
          )}

          {phase === "ready" && url && (
            <button
              onClick={handleAction}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700"
              autoFocus
            >
              <span>{label.icon}</span> {label.text}
            </button>
          )}

          {phase === "done" && url && (
            <div className="text-center">
              <div className="text-sm font-medium text-green-400">
                {action === "copy" ? "✓ Link copied to clipboard" : "✓ Your download has started"}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {action === "copy"
                  ? "The link works for a limited time from this network."
                  : "Didn't start? Use the button below."}
              </div>
              <div className="mt-3 flex justify-center gap-3">
                <button
                  onClick={() => onReady(url)}
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
                >
                  {label.icon} {action === "copy" ? "Copy again" : "Download again"}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center">
              <div className="text-sm text-red-400">{error}</div>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="mt-3 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
              >
                Try again
              </button>
            </div>
          )}

          {!["ready", "done", "blocked"].includes(phase) && (
            <div className="mt-3 text-center text-xs text-gray-500">
              Don't want to wait?{" "}
              <button onClick={handleUpgrade} className="text-yellow-400 hover:underline">Upgrade to Premium</button>{" "}
              for instant, ad-free access.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
