import { useState } from "react";

export default function FolderItem({ folder, onNavigate, onDelete, formatFileSize }) {
  const [copyStatus, setCopyStatus] = useState("copy");

  async function handleCopyLink(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(folder.downloadUrl);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("copy"), 3000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("copy"), 3000);
    }
  }

  return (
    <div className="group flex items-center p-4 bg-gray-800 hover:bg-gray-750 rounded-lg border border-gray-700 hover:border-gray-600 transition-all">
      <div
        className="flex items-center flex-1 cursor-pointer"
        onClick={() => onNavigate(folder.path)}
      >
        <div className="text-2xl mr-4 text-blue-400 group-hover:text-blue-300 transition-colors">
          📁
        </div>
        <div className="flex-1">
          <div className="font-medium text-white group-hover:text-yellow-300 transition-colors">
            {folder.name}
          </div>
          <div className="text-sm text-gray-400 mt-1 space-y-1">
            <div>
              {folder.size !== undefined && formatFileSize ? (
                <span className="inline-flex items-center">
                  <span className="mr-2">💾</span>
                  <span className="font-medium text-blue-400">{formatFileSize(folder.size)}</span>
                  {folder.fileCount !== undefined && (
                    <span className="ml-2 text-gray-500">• {folder.fileCount} files</span>
                  )}
                </span>
              ) : (
                "Folder"
              )}
            </div>
          </div>
        </div>
        <div className="text-gray-500 group-hover:text-gray-400 transition-colors mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Download button */}
        {folder.downloadUrl && (
          <a
            href={folder.downloadUrl}
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-green-600/20 rounded-lg transition-all inline-block"
            title="Download folder as ZIP"
            download
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </a>
        )}

        {/* Copy link button */}
        {folder.downloadUrl && (
          <button
            onClick={handleCopyLink}
            className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all text-xs font-medium ${
              copyStatus === "copied" ? "bg-green-600/30 text-green-400" :
              copyStatus === "error"  ? "bg-red-600/30 text-red-400" :
                                        "hover:bg-gray-600/40 text-gray-400 hover:text-gray-200"
            }`}
            title="Copy download link"
          >
            {copyStatus === "copied" ? "✓" : copyStatus === "error" ? "✗" : "🔗"}
          </button>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder.path, folder.name, 'directory');
            }}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-600/20 rounded-lg transition-all"
            title="Delete folder"
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}