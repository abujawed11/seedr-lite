
```
seedr-lite
├─ .claude
│  └─ settings.local.json
├─ backup-working-torrent-implementation
│  ├─ README.md
│  ├─ seedr-server-backup
│  │  ├─ package.json
│  │  └─ src
│  │     ├─ controllers
│  │     │  ├─ files.controller.js
│  │     │  ├─ stream.controller.js
│  │     │  └─ torrents.controller.js
│  │     ├─ index.js
│  │     ├─ middlewares
│  │     │  ├─ asyncHandler.js
│  │     │  └─ errorHandler.js
│  │     ├─ server.js
│  │     ├─ services
│  │     │  ├─ linkSigner.js
│  │     │  └─ torrentManager.js
│  │     └─ utils
│  │        ├─ ensureDirs.js
│  │        ├─ logger.js
│  │        └─ trackers.js
│  └─ seedr-web-backup
│     ├─ package.json
│     ├─ src
│     │  ├─ api.js
│     │  ├─ App.css
│     │  ├─ App.jsx
│     │  ├─ assets
│     │  │  └─ react.svg
│     │  ├─ components
│     │  │  ├─ Breadcrumb.jsx
│     │  │  ├─ FileExplorer.jsx
│     │  │  ├─ FileItem.jsx
│     │  │  ├─ FolderItem.jsx
│     │  │  └─ TorrentSection.jsx
│     │  ├─ index.css
│     │  └─ main.jsx
│     └─ vite.config.js
├─ CLAUDE.md
├─ README.md
├─ seedr-server
│  ├─ data
│  │  └─ .claude
│  │     └─ settings.local.json
│  ├─ db-manager.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ src
│  │  ├─ controllers
│  │  │  ├─ files.controller.js
│  │  │  ├─ stream.controller.js
│  │  │  └─ torrents.controller.js
│  │  ├─ index.js
│  │  ├─ middlewares
│  │  │  ├─ asyncHandler.js
│  │  │  ├─ auth.js
│  │  │  ├─ errorHandler.js
│  │  │  └─ storageValidator.js
│  │  ├─ models
│  │  │  └─ database.js
│  │  ├─ server.js
│  │  ├─ services
│  │  │  ├─ linkSigner.js
│  │  │  └─ torrentManager.js
│  │  └─ utils
│  │     ├─ ensureDirs.js
│  │     ├─ logger.js
│  │     ├─ storage.js
│  │     └─ trackers.js
│  └─ test-quota.js
├─ seedr-web
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ api.js
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ AuthWrapper.jsx
│  │  │  ├─ Breadcrumb.jsx
│  │  │  ├─ FileExplorer.jsx
│  │  │  ├─ FileItem.jsx
│  │  │  ├─ FolderItem.jsx
│  │  │  ├─ LoginForm.jsx
│  │  │  ├─ MediaPlayer.jsx
│  │  │  ├─ RegisterForm.jsx
│  │  │  └─ TorrentSection.jsx
│  │  ├─ context
│  │  │  └─ AuthContext.jsx
│  │  ├─ index.css
│  │  └─ main.jsx
│  └─ vite.config.js
├─ setup-structure.ps1
└─ WORK_FLOW.md

```