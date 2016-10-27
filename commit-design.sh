#!/bin/sh
set -eu
_out="$PATTERNLING_OUTPUT_REPO_PATH"
_now="$1"
mkdir "$_out/v1/$_now"
cp design.svg "$_out/v1/$_now/design-$_now.svg"
cp design.png "$_out/v1/$_now/design-$_now.png"
cd "$_out"
git pull --ff-only
git add "v1/$_now"
git commit -m "patternling bot generated $_now"
git push
