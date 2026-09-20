#!/bin/sh
set -eu
mkdir -p dist/guides
cp index.html about.html privacy.html robots.txt styles.css script.js dist/
cp guides/*.html dist/guides/
if [ -f sitemap.xml ]; then cp sitemap.xml dist/; fi
