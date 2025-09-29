#!/bin/bash
# Correct WebKit dependencies installation for Ubuntu Noble
# Based on actual missing libraries from ldd output

echo "Installing WebKit dependencies based on actual missing libraries..."

sudo apt-get update

# Install the packages that provide the missing libraries
sudo apt-get install -y \
    libwebkitgtk-6.0-4 \
    libvpx9 \
    libevent-2.1-7t64 \
    libwebpmux3 \
    libgtk-4-1 \
    libgraphene-1.0-0 \
    libjavascriptcoregtk-6.0-37

echo "WebKit dependencies installation completed!"
echo "Testing WebKit..."
npx playwright test --project=webkit --grep="should verify Playwright configuration"
