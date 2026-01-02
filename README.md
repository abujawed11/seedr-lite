
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
```
seedr-lite
├─ .claude
│  └─ settings.local.json
├─ ADMIN_2FA_SETUP.md
├─ ADMIN_IP_WHITELIST_GUIDE.md
├─ ADMIN_LOGIN_GUIDE.md
├─ ADMIN_SECURITY_GUIDE.md
├─ ADMIN_SYSTEM_GUIDE.md
├─ CLAUDE.md
├─ FIXED_ADMIN_REDIRECT.md
├─ IMPLEMENTATION_SUMMARY.md
├─ LOGGING_IMPLEMENTATION_GUIDE.md
├─ QUICK_START_ADMIN.md
├─ QUOTA_UPGRADE_GUIDE.md
├─ README.md
├─ seedr-server
│  ├─ create-admin.js
│  ├─ data
│  │  └─ .claude
│  │     └─ settings.local.json
│  ├─ db-manager.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ setup-default-admin.js
│  ├─ src
│  │  ├─ config
│  │  │  └─ plans.js
│  │  ├─ controllers
│  │  │  ├─ files.controller.js
│  │  │  ├─ inspect.controller.js
│  │  │  ├─ stream.controller.js
│  │  │  ├─ torrents.controller.js
│  │  │  └─ torrents.controller.old.js
│  │  ├─ database.db
│  │  ├─ index.js
│  │  ├─ middlewares
│  │  │  ├─ adminAuth.js
│  │  │  ├─ asyncHandler.js
│  │  │  ├─ auth.js
│  │  │  ├─ errorHandler.js
│  │  │  └─ storageValidator.js
│  │  ├─ models
│  │  │  ├─ database.db
│  │  │  ├─ database.js
│  │  │  ├─ database.js.backup
│  │  │  ├─ database_old.js
│  │  │  └─ reservations.js
│  │  ├─ server.js
│  │  ├─ services
│  │  │  ├─ emailService.js
│  │  │  ├─ linkSigner.js
│  │  │  ├─ torrentManager.js
│  │  │  └─ torrentMetadata.js
│  │  └─ utils
│  │     ├─ activityLogger.js
│  │     ├─ ensureDirs.js
│  │     ├─ logger.js
│  │     ├─ otpGenerator.js
│  │     ├─ productionQuotaEnforcer.js
│  │     ├─ quotaMonitor.js
│  │     ├─ simpleTorrentSizeDetector.js
│  │     ├─ storage.js
│  │     ├─ subscriptionMonitor.js
│  │     ├─ torrentSizeDetector.js
│  │     └─ trackers.js
│  ├─ srv
│  │  └─ storage
│  │     ├─ hls
│  │     ├─ library
│  │     │  └─ users
│  │     │     ├─ NnGtyVmyDnXb4NPercnMk
│  │     │     │  └─ Saiyaara.2025.1080p.WEBRip.AAC.x264-skyflickz
│  │     │     │     ├─ Raed me.txt
│  │     │     │     ├─ Saiyaara.2025.1080p.WEBRip.AAC.x264-skyflickz.mp4
│  │     │     │     ├─ Torrent Downloaded from 1337x.to.txt
│  │     │     │     └─ _____padding_file_0_____
│  │     │     └─ TqSlEfDRCxKR7RMutjtUn
│  │     │        └─ Saiyaara.2025.1080p.WEBRip.AAC.x264-skyflickz
│  │     │           ├─ Raed me.txt
│  │     │           ├─ Saiyaara.2025.1080p.WEBRip.AAC.x264-skyflickz.mp4
│  │     │           ├─ Torrent Downloaded from 1337x.to.txt
│  │     │           └─ _____padding_file_0_____
│  │     └─ thumbs
│  └─ test-smtp.js
├─ seedr-web
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ apple-touch-icon.png
│  │  ├─ favicon-96x96.png
│  │  ├─ favicon.ico
│  │  ├─ favicon.svg
│  │  ├─ manifest.webmanifest
│  │  ├─ mypeercloud.png
│  │  ├─ robots.txt
│  │  ├─ sitemap.xml
│  │  ├─ vite.svg
│  │  ├─ web-app-manifest-192x192.png
│  │  └─ web-app-manifest-512x512.png
│  ├─ README.md
│  ├─ src
│  │  ├─ api.js
│  │  ├─ api.js.bak
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ admin
│  │  │  │  └─ UserFilters.jsx
│  │  │  ├─ AdminOTPVerification.jsx
│  │  │  ├─ AuthWrapper.jsx
│  │  │  ├─ Breadcrumb.jsx
│  │  │  ├─ CookieConsent.jsx
│  │  │  ├─ Disclaimer.jsx
│  │  │  ├─ DisclaimerFooter.jsx
│  │  │  ├─ FileExplorer.jsx
│  │  │  ├─ FileItem.jsx
│  │  │  ├─ FolderItem.jsx
│  │  │  ├─ Footer.jsx
│  │  │  ├─ ForgotPassword.jsx
│  │  │  ├─ LegalModal.jsx
│  │  │  ├─ LoginForm.jsx
│  │  │  ├─ MediaPlayer.jsx
│  │  │  ├─ MyAccount.jsx
│  │  │  ├─ Navbar.jsx
│  │  │  ├─ OTPVerification.jsx
│  │  │  ├─ PasswordToggle.jsx
│  │  │  ├─ PlansModal.jsx
│  │  │  ├─ PrivacyContent.jsx
│  │  │  ├─ RegisterForm.jsx
│  │  │  ├─ ResetPassword.jsx
│  │  │  ├─ TermsContent.jsx
│  │  │  ├─ TorrentSection.jsx
│  │  │  ├─ TorrentSection.jsx.bak
│  │  │  └─ VerifyResetOTP.jsx
│  │  ├─ context
│  │  │  └─ AuthContext.jsx
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ AdminActivityLogs.jsx
│  │  │  ├─ AdminDashboard.jsx
│  │  │  ├─ ContactPage.jsx
│  │  │  ├─ DMCAPage.jsx
│  │  │  ├─ HomePage.jsx
│  │  │  ├─ PrivacyPage.jsx
│  │  │  ├─ RefundPage.jsx
│  │  │  ├─ ShippingDeliveryPage.jsx
│  │  │  └─ TermsPage.jsx
│  │  └─ utils
│  │     └─ recaptcha.js
│  └─ vite.config.js
├─ setup-structure.ps1
├─ SETUP_EMAIL_RECAPTCHA.md
├─ token.txt
└─ WORK_FLOW.md

```