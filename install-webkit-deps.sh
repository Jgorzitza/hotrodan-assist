#!/bin/bash
# WebKit dependencies installation script
# Run with: sudo ./install-webkit-deps.sh

echo "Installing WebKit dependencies for Playwright..."

# Install WebKit dependencies
apt-get update
apt-get install -y \
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

echo "WebKit dependencies installed successfully!"
echo "Run 'npx playwright install webkit' to install the WebKit browser"
