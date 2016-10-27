#!/bin/sh
set -eux
_out="$PATTERNLING_OUTPUT_REPO_PATH"
_now="$1"
_link="$2"
#mkdir -p "$_out/v1/$_now"
printf '%s\n' "$_link" > "$_out/v1/$_now/twitter-post-link.md"
cd "$_out"
git pull --ff-only
git add "v1/$_now"
git commit -m "patternling bot twitter link $_now"
git push
