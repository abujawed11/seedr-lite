import { useState } from "react";
import { deleteFile } from "../api";
import Breadcrumb from "./Breadcrumb";
import FolderItem from "./FolderItem";
import FileItem from "./FileItem";

export default function FileExplorer({ browseData, currentPath, onNavigate, formatFileSize, onFileDeleted }) {
  const [viewMode, setViewMode] = useState("list"); // list or grid

  const isEmpty = browseData.dirs.length === 0 && browseData.files.length === 0;

  const handleDelete = async (path, name, type) => {
    let confirmMessage = `Are you sure you want to delete ${type} "${name}"?`;
    if (type === 'directory') {
      confirmMessage += ' This will permanently delete all files inside it.';
    }

    if (confirm(confirmMessage)) {
      try {
        await deleteFile(path);
        onFileDeleted && onFileDeleted();
      } catch (err) {
        console.error('Failed to delete:', err);
        alert(`Failed to delete ${type}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-yellow-400 flex items-center">
          <span className="mr-3">🗂️</span>
          File Explorer
        </h2>
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="text-sm text-gray-400">
            {browseData.dirs.length > 0 && `${browseData.dirs.length} folders`}
            {browseData.dirs.length > 0 && browseData.files.length > 0 && " • "}
            {browseData.files.length > 0 && `${browseData.files.length} files`}
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-yellow-500 text-gray-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-yellow-500 text-gray-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ⊞ Grid
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb currentPath={currentPath} onNavigate={onNavigate} />

      {/* Content */}
      {isEmpty ? (
        <EmptyState currentPath={currentPath} />
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {browseData.dirs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                <span className="mr-2">📁</span>
                Folders ({browseData.dirs.length})
              </h3>
              <div className={viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-2"
              }>
                {browseData.dirs.map((dir) => (
                  <FolderItem
                    key={dir.path}
                    folder={dir}
                    onNavigate={onNavigate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {browseData.files.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                <span className="mr-2">📄</span>
                Files ({browseData.files.length})
              </h3>
              <div className={viewMode === "grid"
                ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
                : "space-y-2"
              }>
                {browseData.files.map((file) => (
                  <FileItem
                    key={file.path}
                    file={file}
                    formatFileSize={formatFileSize}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ currentPath }) {
  return (
    <div className="bg-gray-800 p-12 rounded-xl border border-gray-700 text-center">
      <div className="text-gray-400 text-8xl mb-6">📂</div>
      <h3 className="text-xl font-semibold text-gray-300 mb-2">
        This folder is empty
      </h3>
      <p className="text-gray-400 mb-4">
        {currentPath
          ? `No files or folders found in "${currentPath}"`
          : "No files have been downloaded yet"
        }
      </p>
      {!currentPath && (
        <p className="text-gray-500 text-sm">
          Add some torrents to see your downloaded files here
        </p>
      )}
    </div>
  );
}