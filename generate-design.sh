#!/bin/sh
set -eu
node script.js > design.svg
#inkscape --without-gui --export-png=design.png --export-background-opacity=0 -w 440 -h 220 design.svg
convert -density 200 design.svg -background "#ccc" -flatten -resize 880x440 design.png
#convert -density 200 design.svg -resize 440x220 -transparent white design.png
