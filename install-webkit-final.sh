#!/bin/bash
# Final WebKit dependencies installation for Ubuntu Noble
# Based on the complete list of missing libraries from Playwright

echo "Installing ALL WebKit dependencies for Ubuntu Noble..."

sudo apt-get update

# Install packages that provide the missing libraries
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
    libgl1-mesa-glx \
    libx264-164 \
    libflite1

echo "WebKit dependencies installation completed!"
echo "Testing WebKit..."
npx playwright test --project=webkit --grep="should verify Playwright configuration"
