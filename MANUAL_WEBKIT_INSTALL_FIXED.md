# Manual WebKit Installation - CORRECTED for Ubuntu Noble

## Issues Fixed
1. `libgl1-mesa-glx` → `libgles2` (correct Ubuntu Noble package)
2. Added `npx playwright install` step after system dependencies

## Step 1: Update package lists
```bash
sudo apt-get update
```

## Step 2: Install WebKit dependencies (CORRECTED PACKAGES)
```bash
sudo apt-get install -y \
    libgtk-4-1 \
    libgraphene-1.0-0 \
    libwoff1 \
    libvpx9 \
    libevent-2.1-7t64 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer-plugins-good1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    libgstreamer-gl1.0-0 \
    libwebpdemux2 \
    libavif16 \
    libharfbuzz-icu0 \
    libwebpmux3 \
    libenchant-2-2 \
    libsecret-1-0 \
    libhyphen0 \
    libmanette-0.2-0 \
    libgles2 \
    libx264-164 \
    libflite1
```

## Step 3: Reinstall Playwright browsers
```bash
npx playwright install
```

## Step 4: Test WebKit
```bash
npx playwright test --project=webkit --grep="should verify Playwright configuration"
```

## Key Changes from Previous Version
- `libgl1-mesa-glx` → `libgles2` (Ubuntu Noble compatible)
- Added Playwright browser reinstallation step
- All package names verified for Ubuntu Noble

