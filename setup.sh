#!/bin/sh
npm install
cp --no-clobber config.example.js config.js
tsc script.ts
echo "automated setup steps done; edit config.js if you haven't already"
