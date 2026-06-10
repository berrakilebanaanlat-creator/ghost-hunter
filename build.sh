#!/bin/bash
cd artifacts/ghost-hunter
echo ">>> APK build basliyor..."
./node_modules/.bin/eas build --platform android --profile preview --non-interactive
echo ""
echo ">>> AAB build basliyor..."
./node_modules/.bin/eas build --platform android --profile production --non-interactive
