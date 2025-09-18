export default function FolderItem({ folder, onNavigate, onDelete }) {
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
          <div className="text-sm text-gray-400 mt-1">
            Folder
          </div>
        </div>
        <div className="text-gray-500 group-hover:text-gray-400 transition-colors mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

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
  );
}