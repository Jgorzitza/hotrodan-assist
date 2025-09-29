#!/bin/bash
# Fixed WebKit dependencies installation for Ubuntu Noble
# Corrected package names based on actual Ubuntu Noble packages

echo "Installing WebKit dependencies with corrected package names..."

sudo apt-get update

# Install packages with correct Ubuntu Noble package names
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

echo "WebKit dependencies installation completed!"
echo "Reinstalling Playwright browsers..."
npx playwright install

echo "Testing WebKit..."
npx playwright test --project=webkit --grep="should verify Playwright configuration"
