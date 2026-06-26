# Seedr App — React Native (Expo) Build Plan

> Backend: `seedr-server` (unchanged). This is a mobile port of `seedr-web`.
> Stack: Expo SDK 56 · Expo Router · NativeWind v4 · TypeScript

---

## Current Status
- [x] Expo project initialized (SDK 56)
- [x] NativeWind v4 configured and working
- [x] Phase 1 — Foundation
- [x] Phase 2 — Auth Screens
- [x] Phase 3 — Core: Torrents
- [ ] Phase 4 — Core: File Explorer
- [ ] Phase 5 — Media Player
- [ ] Phase 6 — Account & Plans
- [ ] Phase 7 — Polish & Release

---

## Phase 1 — Foundation (API + Auth Context)

Port the API layer and auth system from web to React Native.

### Tasks
- [x] Install dependencies: `axios`, `@react-native-async-storage/async-storage`
- [x] Create `src/api.ts` — port from `seedr-web/src/api.js` with these changes:
  - Replace `localStorage` → `AsyncStorage`
  - Replace `window.location.reload()` → navigation reset via Expo Router
  - Set `API_BASE` from an env config (use `expo-constants` or `.env`)
- [x] Create `src/context/AuthContext.tsx` — port from web with:
  - `AsyncStorage` for token persistence
  - Same `login`, `register`, `logout`, `setAuthData`, `refreshUserProfile`, `fetchDetailedQuota` functions
- [x] Create `src/constants/config.ts` — store `API_BASE_URL` here
- [x] Set up Expo Router layout in `src/app/_layout.tsx`:
  - Wrap app in `AuthProvider`
  - Handle auth-gated routing (unauthenticated → auth screens)

### Web → RN key differences
| Web | React Native |
|-----|-------------|
| `localStorage.getItem/setItem` | `await AsyncStorage.getItem/setItem` |
| `window.location.reload()` | `router.replace('/login')` |
| `EventSource` (SSE) | `react-native-sse` package |

---

## Phase 2 — Auth Screens

### Screens to build
- [x] `src/app/(auth)/login.tsx` — port `LoginForm.jsx`
  - Username + password fields
  - Show password toggle
  - Error display
  - Admin OTP flow (if `requiresOTP` in response)
- [x] `src/app/(auth)/register.tsx` — port `RegisterForm.jsx`
  - Username, email, password, confirm password
  - Age/Terms/Privacy checkboxes (Modal bottom sheet instead of LegalModal)
  - OTP verification step after submit
- [x] `src/app/(auth)/otp-verify.tsx` — port `OTPVerification.jsx`
- [x] `src/app/(auth)/admin-otp.tsx` — port `AdminOTPVerification.jsx`
- [x] `src/app/(auth)/forgot-password.tsx` — port `ForgotPassword.jsx`
- [x] `src/app/(auth)/reset-password.tsx` — port `ResetPassword.jsx`
- [x] `src/app/(auth)/verify-reset-otp.tsx` — port `VerifyResetOTP.jsx`

### Web → RN key differences
| Web | React Native |
|-----|-------------|
| `<form onSubmit>` | `<TouchableOpacity onPress>` |
| `<input>` | `<TextInput>` |
| `<input type="password">` | `<TextInput secureTextEntry>` |
| `<input type="checkbox">` | Custom checkbox component |
| CSS modals | `react-native` Modal or bottom sheet |
| `window.dispatchEvent(...)` | Pass callbacks as props / navigation params |

---

## Phase 3 — Core: Torrents

Main torrent management screen.

### Screens / Components to build
- [x] `src/app/(main)/index.tsx` — Home screen (combines TorrentSection + quota bar)
- [x] `src/components/TorrentSection.tsx` — port `TorrentSection.jsx`
  - Magnet link input (TextInput)
  - Add multiple magnet fields
  - `.torrent` file upload via `expo-document-picker`
  - Copyright warning collapsible
  - Active torrents list
- [x] `src/components/TorrentCard.tsx` — port `TorrentCard` inner component
  - Progress bar
  - Status badge (Downloading / Paused / Connecting / Completed)
  - Controls: Pause, Resume, Stop, Delete
  - File list (collapsible)
  - `Alert.alert()` for delete confirmation (replaces `window.confirm()`)
- [x] `src/components/NotificationBanner.tsx` — quota exceeded alerts
- [x] `src/hooks/useTorrents.ts` — SSE or polling logic
  - Install `react-native-sse`
  - Connect to `/api/torrents/events?token=...`
  - Fallback: poll `/api/torrents` every 5s if SSE fails

### Web → RN key differences
| Web | React Native |
|-----|-------------|
| `<input type="file" accept=".torrent">` | `expo-document-picker` |
| `window.confirm()` | `Alert.alert('title', 'msg', buttons)` |
| `EventSource` | `react-native-sse` |
| CSS progress bar | `<View style={{width: '%'}} />` |

---

## Phase 4 — Core: File Explorer

### Screens / Components to build
- [ ] `src/app/(main)/files.tsx` — File Explorer screen
- [ ] `src/components/FileExplorer.tsx` — port `FileExplorer.jsx`
  - Breadcrumb navigation
  - Folder list + File list
  - List / Grid view toggle
  - Refresh button
- [ ] `src/components/Breadcrumb.tsx` — port `Breadcrumb.jsx` using `ScrollView` horizontal
- [ ] `src/components/FolderItem.tsx` — port `FolderItem.jsx`
  - Tap to navigate into folder
  - Long press or swipe to delete
- [ ] `src/components/FileItem.tsx` — port `FileItem.jsx`
  - File icon by extension
  - Play button → open MediaPlayer
  - Download button → `expo-file-system` + `expo-sharing`
  - Copy link → `expo-clipboard`
  - Delete with `Alert.alert()` confirmation

### Web → RN key differences
| Web | React Native |
|-----|-------------|
| `navigator.clipboard.writeText()` | `expo-clipboard` Clipboard.setStringAsync() |
| `<a href download>` | `expo-file-system` downloadAsync + `expo-sharing` |
| `window.open(url)` | `expo-web-browser` openBrowserAsync() |
| hover states | `onPressIn` / `onPressOut` for visual feedback |
| CSS grid | `FlatList` with `numColumns` prop |

---

## Phase 5 — Media Player

### Components to build
- [ ] `src/components/MediaPlayer.tsx` — port `MediaPlayer.jsx`
  - Install `expo-av` (or `expo-video` for SDK 56)
  - Video playback with controls (play/pause/seek/fullscreen)
  - Audio playback
  - Close/dismiss button
  - Stream from backend URL directly

### Notes
- `expo-video` is the newer API in SDK 56, preferred over `expo-av` for video
- Audio still uses `expo-av`
- Stream URL from backend: `/stream/:infoHash/:fileIndex`

---

## Phase 6 — Account & Plans

### Screens to build
- [ ] `src/app/(main)/account.tsx` — port `MyAccount.jsx`
  - Profile info (username, email, plan)
  - Storage quota bar
  - Subscription details
  - Logout button
- [ ] `src/app/(main)/plans.tsx` — port `PlansModal.jsx` as a full screen
  - Plan cards (Free / Premium tiers)
  - Upgrade request form
  - Payment history
- [ ] `src/components/StorageBar.tsx` — quota used / available visual bar

---

## Phase 7 — Navigation & Polish

### Navigation structure (Expo Router)
```
src/app/
├── _layout.tsx              ← Root layout (AuthProvider, theme)
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── otp-verify.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
└── (main)/
    ├── _layout.tsx          ← Bottom tab navigator
    ├── index.tsx            ← Torrents tab
    ├── files.tsx            ← Files tab
    └── account.tsx          ← Account tab
```

### Polish tasks
- [ ] Bottom tab bar with 3 tabs: Torrents, Files, Account
- [ ] Storage quota bar in Account tab
- [ ] Pull-to-refresh on Torrents and Files screens
- [ ] Loading skeletons / spinners
- [ ] Empty states (no torrents, no files)
- [ ] App icon and splash screen (already configured in `app.json`)
- [ ] `.env` setup for `API_BASE_URL` (use `expo-constants` + `app.config.js`)
- [ ] Android back button handling

---

## Dependencies to Install (all phases)

```bash
# Phase 1 ✅ Done — installed via npx expo install for SDK compatibility
# npm install axios @react-native-async-storage/async-storage

# Phase 3 ✅ Done
# npm install react-native-sse
# npx expo install expo-document-picker

# Phase 4
npx expo install expo-file-system expo-sharing expo-clipboard expo-web-browser

# Phase 5
npx expo install expo-video expo-av

# Navigation (already included via expo-router)
```

---

## Notes & Decisions

- **SSE**: Use `react-native-sse` first. If unstable, fall back to polling every 5s.
- **File download**: Use `expo-file-system` to download to device, then `expo-sharing` to let user save/share.
- **Admin panel**: Skip for mobile — admin features are desktop-only. If admin logs in, show a message saying "Use the web app for admin functions."
- **Ads (AdBanner)**: Skip for mobile app.
- **ReCaptcha**: Not needed for mobile — backend should allow mobile clients to skip it.
- **Terms/Privacy modals**: Use a full-screen modal or `expo-web-browser` to open the web URLs.



┌───────┬───────────────────────────────────────────────────────────────┐
│ Phase │                             What                              │
├───────┼───────────────────────────────────────────────────────────────┤
│ 1     │ API layer + AuthContext (port with AsyncStorage)              │
├───────┼───────────────────────────────────────────────────────────────┤
│ 2     │ Auth screens (Login, Register, OTP, Forgot/Reset Password)    │
├───────┼───────────────────────────────────────────────────────────────┤
│ 3     │ Torrents screen (add magnet, file upload, torrent cards, SSE) │
├───────┼───────────────────────────────────────────────────────────────┤
│ 4     │ File Explorer (browse, download, copy link, delete)           │
├───────┼───────────────────────────────────────────────────────────────┤
│ 5     │ Media Player (video/audio streaming with expo-video)          │
├───────┼───────────────────────────────────────────────────────────────┤
│ 6     │ Account & Plans screen (profile, quota, subscription)         │
├───────┼───────────────────────────────────────────────────────────────┤
│ 7     │ Navigation (bottom tabs), polish, env config                  │
└───────┴───────────────────────────────────────────────────────────────┘
