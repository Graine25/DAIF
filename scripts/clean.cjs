#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const outPath = path.resolve(__dirname, '..', 'out');

if (fs.existsSync(outPath)) {
  fs.rmSync(outPath, { recursive: true, force: true });
}
