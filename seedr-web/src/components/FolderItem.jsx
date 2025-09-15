export default function FolderItem({ folder, onNavigate }) {
  return (
    <div
      className="group flex items-center p-4 bg-gray-800 hover:bg-gray-750 rounded-lg cursor-pointer border border-gray-700 hover:border-gray-600 transition-all"
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
      <div className="text-gray-500 group-hover:text-gray-400 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}