# setup-structure.ps1
# Create seedr-lite project structure with empty files

$root = "seedr-lite"

# Define directories
$dirs = @(
    "$root/seedr-server/src/routes",
    "$root/seedr-server/src/controllers",
    "$root/seedr-server/src/services",
    "$root/seedr-server/src/middlewares",
    "$root/seedr-server/src/utils",
    "$root/seedr-server/src/storage",
    "$root/seedr-web"
)

# Define files
$files = @(
    "$root/seedr-server/.env.example",
    "$root/seedr-server/package.json",
    "$root/seedr-server/src/index.js",
    "$root/seedr-server/src/server.js",
    "$root/seedr-server/src/routes/torrents.routes.js",
    "$root/seedr-server/src/routes/stream.routes.js",
    "$root/seedr-server/src/controllers/torrents.controller.js",
    "$root/seedr-server/src/controllers/stream.controller.js",
    "$root/seedr-server/src/services/torrentManager.js",
    "$root/seedr-server/src/services/linkSigner.js",
    "$root/seedr-server/src/middlewares/asyncHandler.js",
    "$root/seedr-server/src/middlewares/errorHandler.js",
    "$root/seedr-server/src/utils/logger.js",
    "$root/seedr-server/src/utils/ensureDirs.js"
)

# Create directories
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "Created directory: $dir"
    }
}

# Create files
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "Created file: $file"
    }
}

Write-Host "Project structure created successfully."
