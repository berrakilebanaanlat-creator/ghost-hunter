#!/bin/bash
git remote add github https://github.com/berrakilebanaanlat-creator/ghost-hunter.git 2>/dev/null || git remote set-url github https://github.com/berrakilebanaanlat-creator/ghost-hunter.git
git push github main --force
