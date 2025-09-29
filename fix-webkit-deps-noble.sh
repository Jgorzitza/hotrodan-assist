#!/bin/bash
# Comprehensive WebKit dependencies fix for Ubuntu Noble
echo "Installing missing WebKit dependencies for Ubuntu Noble..."

# Install the specific packages that were missing
sudo apt-get install -y \
    libgtk-4-1 \
    libgraphene-1.0-0 \
    libwoff2-1.0-0 \
    libvpx9 \
    libevent-2.1-7t64 \
    libgstallocators-1.0-0 \
    libgstapp-1.0-0 \
    libgstpbutils-1.0-0 \
    libgstaudio-1.0-0 \
    libgsttag-1.0-0 \
    libgstvideo-1.0-0 \
    libgstgl-1.0-0 \
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
    libgl1-mesa-glx \
    libx264-164

echo "WebKit dependencies installation completed!"
