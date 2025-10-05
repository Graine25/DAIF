#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const srcRoot = path.resolve(__dirname, '..', 'src', 'renderer');
const outRoot = path.resolve(__dirname, '..', 'out', 'renderer');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(fileName) {
  const from = path.join(srcRoot, fileName);
  const to = path.join(outRoot, fileName);

  if (!fs.existsSync(from)) {
    throw new Error(`Static asset not found: ${from}`);
  }

  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

ensureDir(outRoot);

['index.html', 'styles.css'].forEach(copyFile);
