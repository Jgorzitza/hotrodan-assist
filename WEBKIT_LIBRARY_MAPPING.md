# WebKit Library Mapping for Ubuntu Noble

## Missing Libraries → Correct Packages

Based on the actual ldd output and Playwright validation, here's the mapping:

| Missing Library | Correct Package | Status |
|----------------|-----------------|--------|
| libgtk-4.so.1 | libgtk-4-1 | ✅ Available |
| libgraphene-1.0.so.0 | libgraphene-1.0-0 | ✅ Available |
| libwoff2dec.so.1.0.2 | libwoff1 | ✅ Available (different name) |
| libvpx.so.9 | libvpx9 | ✅ Available |
| libevent-2.1.so.7 | libevent-2.1-7t64 | ✅ Available |
| libgstallocators-1.0.so.0 | libgstreamer-plugins-base1.0-0 | ✅ Available |
| libgstapp-1.0.so.0 | libgstreamer-plugins-base1.0-0 | ✅ Available |
| libgstpbutils-1.0.so.0 | libgstreamer-plugins-base1.0-0 | ✅ Available |
| libgstaudio-1.0.so.0 | libgstreamer-plugins-good1.0-0 | ✅ Available |
| libgsttag-1.0.so.0 | libgstreamer-plugins-good1.0-0 | ✅ Available |
| libgstvideo-1.0.so.0 | libgstreamer-plugins-good1.0-0 | ✅ Available |
| libgstgl-1.0.so.0 | libgstreamer-gl1.0-0 | ✅ Available |
| libwebpdemux.so.2 | libwebpdemux2 | ✅ Available |
| libavif.so.16 | libavif16 | ✅ Available |
| libharfbuzz-icu.so.0 | libharfbuzz-icu0 | ✅ Available |
| libwebpmux.so.3 | libwebpmux3 | ✅ Available |
| libenchant-2.so.2 | libenchant-2-2 | ✅ Available |
| libsecret-1.so.0 | libsecret-1-0 | ✅ Available |
| libhyphen.so.0 | libhyphen0 | ✅ Available |
| libmanette-0.2.so.0 | libmanette-0.2-0 | ✅ Available |
| libGLESv2.so.2 | libgl1-mesa-glx | ✅ Available |
| libx264.so | libx264-164 | ✅ Available |
| libflite.so.1 | libflite1 | ✅ Available |

## Installation Command

```bash
sudo ./install-webkit-final.sh
```

## Test Command

```bash
npx playwright test --project=webkit --grep="should verify Playwright configuration"
```

## Notes

- Some libraries are provided by the same package (e.g., gstreamer plugins)
- Package names differ from library names (e.g., libwoff2dec.so.1.0.2 → libwoff1)
- Ubuntu Noble uses different versioning (e.g., libx264-164 instead of libx264-163)
