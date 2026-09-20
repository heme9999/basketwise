#!/bin/sh
set -eu
mkdir -p dist/guides
mkdir -p dist/assets
cp index.html about.html privacy.html robots.txt styles.css script.js dist/
cp guides/*.html dist/guides/
cp assets/*.jpg dist/assets/
if [ -f sitemap.xml ]; then cp sitemap.xml dist/; fi
