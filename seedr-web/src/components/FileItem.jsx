import { useState } from "react";

export default function FileItem({ file, formatFileSize }) {
  const [copyStatus, setCopyStatus] = useState("copy");

  function getFileIcon(fileName, mimeType) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (mimeType?.startsWith('video/')) return '🎬';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.includes('pdf')) return '📄';
    if (['txt', 'md', 'readme'].includes(ext)) return '📝';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
    if (['exe', 'msi', 'dmg', 'deb', 'rpm'].includes(ext)) return '⚙️';
    if (['iso', 'img'].includes(ext)) return '💿';
    return '📄';
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(file.directUrl);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("copy"), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("copy"), 3000);
    }
  }

  function getCopyButtonContent() {
    switch (copyStatus) {
      case "copied":
        return { icon: "✓", text: "Copied!", className: "bg-green-600 hover:bg-green-700" };
      case "error":
        return { icon: "✗", text: "Error", className: "bg-red-600 hover:bg-red-700" };
      default:
        return { icon: "🔗", text: "Copy", className: "bg-gray-600 hover:bg-gray-700" };
    }
  }

  const copyButton = getCopyButtonContent();

  return (
    <div className="group flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex items-center min-w-0 flex-1">
        <div className="text-2xl mr-3 flex-shrink-0">
          {getFileIcon(file.name, file.mime)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-white truncate group-hover:text-yellow-300 transition-colors">
            {file.name}
          </div>
          <div className="flex items-center mt-1 text-sm text-gray-400">
            <span>{formatFileSize(file.size)}</span>
            {file.mime && (
              <>
                <span className="mx-2">•</span>
                <span className="uppercase text-xs bg-gray-700 px-2 py-0.5 rounded">
                  {file.mime.split('/')[0]}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={file.streamUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center"
          title="Play/Stream file"
        >
          <span className="mr-1">▶</span>
          Play
        </a>
        <a
          href={file.downloadUrl}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center"
          title="Download file"
        >
          <span className="mr-1">⬇</span>
          Download
        </a>
        <button
          onClick={handleCopyLink}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center ${copyButton.className}`}
          title="Copy direct link"
        >
          <span className="mr-1">{copyButton.icon}</span>
          {copyButton.text}
        </button>
      </div>
    </div>
  );
}