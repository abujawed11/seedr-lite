import { useState, useEffect, useRef } from "react";
import { startR2Transfer, getR2TransferStatus } from "../api";

const POLL_INTERVAL = 2000;

export default function R2TransferButton({ itemPath, type, fileName }) {
  const [state, setState] = useState("idle"); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const pollRef = useRef(null);
  const jobIdRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  async function handleTransfer(e) {
    e.stopPropagation();
    if (state === "uploading") return;

    setState("uploading");
    setProgress(0);
    setDownloadUrl(null);
    setErrorMsg(null);

    try {
      const { jobId } = await startR2Transfer(itemPath, type);
      jobIdRef.current = jobId;

      pollRef.current = setInterval(async () => {
        try {
          const job = await getR2TransferStatus(jobId);
          setProgress(job.progress);

          if (job.status === "done") {
            clearInterval(pollRef.current);
            setDownloadUrl(job.downloadUrl);
            setState("done");
          } else if (job.status === "error") {
            clearInterval(pollRef.current);
            setErrorMsg(job.error || "Transfer failed");
            setState("error");
          }
        } catch {
          clearInterval(pollRef.current);
          setErrorMsg("Lost connection to server");
          setState("error");
        }
      }, POLL_INTERVAL);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Failed to start transfer");
      setState("error");
    }
  }

  function handleReset(e) {
    e.stopPropagation();
    clearInterval(pollRef.current);
    setState("idle");
    setProgress(0);
    setDownloadUrl(null);
    setErrorMsg(null);
  }

  if (state === "done" && downloadUrl) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-1"
          title="Download from R2 (resumable)"
        >
          <span>☁</span>
          <span>R2 Ready</span>
        </a>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-600/40 rounded-lg text-gray-400 hover:text-gray-200 transition-colors text-xs"
          title="Reset"
        >
          ✕
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-1"
          title={errorMsg}
        >
          <span>☁</span>
          <span>Failed</span>
        </button>
      </div>
    );
  }

  if (state === "uploading") {
    return (
      <button
        disabled
        className="px-3 py-2 bg-orange-500/60 rounded-lg text-sm font-medium text-white flex items-center gap-1 cursor-default min-w-[90px]"
        title="Uploading to R2..."
      >
        <span className="animate-pulse">☁</span>
        <span>{progress}%</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleTransfer}
      className="px-3 py-2 bg-orange-500/80 hover:bg-orange-500 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-1"
      title={`Transfer ${type} to R2 for fast resumable download`}
    >
      <span>☁</span>
      <span>R2</span>
    </button>
  );
}
