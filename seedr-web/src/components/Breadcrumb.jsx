export default function Breadcrumb({ currentPath, onNavigate }) {
  function getBreadcrumbs() {
    if (!currentPath) return [{ name: "Home", path: "", icon: "🏠" }];
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: "Home", path: "", icon: "🏠" }];

    let buildPath = "";
    for (const part of parts) {
      buildPath = buildPath ? `${buildPath}/${part}` : part;
      breadcrumbs.push({
        name: part,
        path: buildPath,
        icon: "📁"
      });
    }

    return breadcrumbs;
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
      <nav className="flex items-center" aria-label="Breadcrumb">
        <div className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center">
              {index > 0 && (
                <svg className="w-4 h-4 text-gray-500 mx-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <button
                onClick={() => onNavigate(crumb.path)}
                className={`flex items-center px-3 py-1.5 rounded-md font-medium transition-all ${
                  index === breadcrumbs.length - 1
                    ? 'text-yellow-400 bg-yellow-400/10 cursor-default'
                    : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-700'
                }`}
                disabled={index === breadcrumbs.length - 1}
              >
                <span className="mr-1.5">{crumb.icon}</span>
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}