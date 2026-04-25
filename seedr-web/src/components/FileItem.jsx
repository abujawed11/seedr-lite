import { useState } from "react";
import MediaPlayer from "./MediaPlayer";
import R2TransferButton from "./R2TransferButton";

export default function FileItem({ file, formatFileSize, onDelete }) {
  const [copyStatus, setCopyStatus] = useState("copy");
  const [showMediaPlayer, setShowMediaPlayer] = useState(false);

  function getFileIcon(fileName, mimeType) {
    const ext = fileName.split('.').pop()?.toLowerCase();

    // Video files
    if (mimeType?.startsWith('video/') ||
        ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv'].includes(ext)) {
      return '🎬';
    }

    // Audio files
    if (mimeType?.startsWith('audio/') ||
        ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'aiff'].includes(ext)) {
      return '🎵';
    }

    // Image files
    if (mimeType?.startsWith('image/') ||
        ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico', 'heic', 'avif'].includes(ext)) {
      return '🖼️';
    }

    // Document files
    if (mimeType?.includes('pdf') || ext === 'pdf') return '📕';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx'].includes(ext)) return '📗';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    if (['txt', 'md', 'readme', 'log'].includes(ext)) return '📝';
    if (['json', 'xml', 'yaml', 'yml', 'csv'].includes(ext)) return '📄';

    // Code files
    if (['js', 'jsx', 'ts', 'tsx', 'vue', 'svelte'].includes(ext)) return '⚛️';
    if (['html', 'htm', 'css', 'scss', 'sass', 'less'].includes(ext)) return '🌐';
    if (['py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift'].includes(ext)) return '💻';
    if (['sql', 'db', 'sqlite'].includes(ext)) return '🗄️';

    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'lzma'].includes(ext)) return '🗜️';

    // Executable files
    if (['exe', 'msi', 'dmg', 'deb', 'rpm', 'appimage', 'snap'].includes(ext)) return '⚙️';

    // Disk images
    if (['iso', 'img', 'dmg', 'vhd', 'vmdk'].includes(ext)) return '💿';

    // Fonts
    if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) return '🔤';

    // 3D and design files
    if (['blend', 'obj', 'fbx', 'dae', 'stl', '3ds', 'max'].includes(ext)) return '🎨';
    if (['psd', 'ai', 'sketch', 'fig', 'xd'].includes(ext)) return '🎨';

    // eBook files
    if (['epub', 'mobi', 'azw', 'azw3', 'fb2'].includes(ext)) return '📚';

    // Subtitles
    if (['srt', 'vtt', 'ass', 'ssa', 'sub'].includes(ext)) return '💬';

    // Default fallback
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

  const isVideoFile = (fileName, mimeType) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return mimeType?.startsWith('video/') ||
      ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv'].includes(ext);
  };

  const isAudioFile = (fileName, mimeType) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return mimeType?.startsWith('audio/') ||
      ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'aiff'].includes(ext);
  };

  const handlePlayClick = (e) => {
    e.preventDefault();
    if (isVideoFile(file.name, file.mime) || isAudioFile(file.name, file.mime)) {
      setShowMediaPlayer(true);
    } else {
      // For non-media files, open in new tab as before
      window.open(file.streamUrl, '_blank');
    }
  };

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
        <button
          onClick={handlePlayClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center"
          title="Play/Stream file"
        >
          <span className="mr-1">▶</span>
          Play
        </button>
        <a
          href={file.downloadUrl}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center"
          title="Download file"
          download
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

        <R2TransferButton itemPath={file.path} type="file" fileName={file.name} />

        {onDelete && (
          <button
            onClick={() => onDelete(file.path, file.name, 'file')}
            className="px-3 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-colors flex items-center"
            title="Delete file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        )}
      </div>

      {/* Media Player Modal */}
      {showMediaPlayer && (
        <MediaPlayer
          src={file.streamUrl}
          title={file.name}
          onClose={() => setShowMediaPlayer(false)}
          type={file.mime}
        />
      )}
    </div>
  );
}