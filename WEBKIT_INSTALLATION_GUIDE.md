# WebKit Dependencies Installation Guide

## Overview
This guide provides instructions for installing WebKit dependencies required for Playwright e2e testing.

## Prerequisites
- Root/sudo access to the system
- Ubuntu/Debian-based Linux distribution

## Installation Methods

### Method 1: Using the Provided Script (Recommended)
```bash
# Make script executable
chmod +x install-webkit-deps.sh

# Run with sudo
sudo ./install-webkit-deps.sh

# Install Playwright WebKit browser
npx playwright install webkit
```

### Method 2: Manual Installation
```bash
# Update package list
sudo apt-get update

# Install WebKit dependencies
sudo apt-get install -y \
    libgtk-4-1 \
    libgraphene-1.0-0 \
    libwoff2dec1.0.2 \
    libvpx9 \
    libevent-2.1-7 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer-plugins-good1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    libgstreamer-gl1.0-0 \
    libgstreamer-codecparsers1.0-0 \
    libgstreamer-fft1.0-0 \
    libflite1 \
    libflite-usenglish1 \
    libflite-cmu-grapheme-lang1 \
    libflite-cmu-grapheme-lex1 \
    libflite-cmu-indic-lang1 \
    libflite-cmu-indic-lex1 \
    libflite-cmulex1 \
    libflite-cmu-time-awb1 \
    libflite-cmu-us-awb1 \
    libflite-cmu-us-kal161 \
    libflite-cmu-us-kal1 \
    libflite-cmu-us-rms1 \
    libflite-cmu-us-slt1 \
    libwebpdemux2 \
    libavif16 \
    libharfbuzz-icu0 \
    libwebpmux3 \
    libenchant-2-2 \
    libsecret-1-0 \
    libhyphen0 \
    libmanette-0.2-0 \
    libgles2-mesa \
    libx264-163

# Install Playwright WebKit browser
npx playwright install webkit
```

### Method 3: Using Playwright's Built-in Installer
```bash
# Install dependencies and browser
npx playwright install-deps webkit
npx playwright install webkit
```

## Verification
After installation, verify WebKit is working:
```bash
# Run WebKit-specific tests
npx playwright test --project=webkit

# Or run all e2e tests
npm run test:e2e
```

## Troubleshooting

### Permission Issues
If you encounter permission issues:
```bash
# Check current user permissions
whoami
groups

# Ensure user is in sudo group
sudo usermod -aG sudo $USER
```

### Missing Libraries
If specific libraries are still missing:
```bash
# Check which libraries are missing
ldd /home/justin/llama_rag/node_modules/playwright-core/.local-browsers/webkit-*/minibrowser-gtk/WPEWebKit

# Install specific missing packages
sudo apt-get install -y <missing-package-name>
```

## Current Status
- WebKit browser: ✅ Installed
- System dependencies: ❌ Missing (requires sudo access)
- Test status: 2/3 browsers working (Chromium, Mobile Chrome)

## Next Steps
1. Run the installation script with sudo access
2. Verify WebKit tests pass
3. Update CI/CD pipeline to include WebKit dependencies
