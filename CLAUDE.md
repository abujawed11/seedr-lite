# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Seedr-Lite is a modern torrent client with a React frontend and Node.js backend. The project consists of two main components:

- **seedr-server**: Node.js/Express API server that handles torrent management using WebTorrent
- **seedr-web**: React/Vite frontend with Tailwind CSS for the user interface

## Development Commands

### Backend (seedr-server)
```bash
cd seedr-server
npm run dev    # Start development server with nodemon
npm start      # Start production server
```

### Frontend (seedr-web)
```bash
cd seedr-web
npm run dev      # Start Vite development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Architecture

### Backend Structure
The server follows a standard Express.js architecture:

- **src/server.js**: Main Express application setup with middleware, CORS, and route registration
- **src/index.js**: Application entry point that initializes directories and starts the server
- **src/controllers/**: Request handlers for torrents and streaming
- **src/routes/**: API route definitions (/api/torrents, /stream, /download, /files)
- **src/services/torrentManager.js**: Core torrent management using WebTorrent library
- **src/middlewares/**: Error handling and async wrapper utilities
- **src/utils/**: Utilities for logging, directory creation, and tracker management
- **src/storage/**: File storage directories (library, hls, thumbs)

### Frontend Structure
React application using functional components and hooks:

- **src/App.jsx**: Main application component managing torrent and file state
- **src/components/**: UI components (TorrentSection, FileExplorer, etc.)
- **src/api.js**: API client functions for backend communication
- Tailwind CSS for styling with gradient themes and responsive design

### Key Features
- **Torrent Management**: Add, monitor, and remove torrents via magnet links
- **File Browsing**: Navigate downloaded files with folder/file explorer
- **Media Streaming**: Direct file streaming and HLS video streaming
- **Real-time Updates**: Automatic polling every 5 seconds for torrent progress
- **Download Control**: Stops seeding automatically after download completion

## Environment Variables

The server requires environment configuration:
- `PORT`: Server port (default: 5000)
- `ROOT`: Storage directory for downloaded files (default: ./src/storage/library)
- `CORS_ORIGIN`: Comma-separated allowed origins for CORS

## API Endpoints

- `GET /api/torrents` - List all torrents
- `POST /api/torrents` - Add new torrent via magnet link
- `DELETE /api/torrents/:infoHash` - Remove torrent
- `GET /api/files/browse?path=` - Browse downloaded files
- `GET /stream/:infoHash/:fileIndex` - Stream torrent files
- `GET /download/:infoHash/:fileIndex` - Download torrent files

## Technology Stack

- **Backend**: Node.js, Express, WebTorrent, JWT authentication
- **Frontend**: React 19, Vite, Tailwind CSS 4, Axios
- **Development**: ESLint, Nodemon for hot reloading