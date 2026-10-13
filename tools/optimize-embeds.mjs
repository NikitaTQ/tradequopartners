#!/usr/bin/env node
/*
 * Make the Claude Design embeds in site/embeds/ production-ready:
 *   - three.js / React come from site/vendor/ (one copy, same origin) instead of unpkg/esm.sh;
 *   - <script type="text/babel"> blocks are compiled ahead of time into <name>.app.js,
 *     so the browser no longer downloads Babel (~3 MB) and compiles JSX on the main thread.
 *
 * Run after dropping a new embed from Claude Design into site/embeds/:
 *   cd tools && npm install && node optimize-embeds.mjs
 * It is idempotent: already-optimized files are left as they are.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { transformSync } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const embeds = join(site, 'embeds');
const vendor = join(site, 'vendor');
const nm = join(here, 'node_modules');

/* ---- vendor copies -------------------------------------------------------- */
const vendorFiles = {
  'three/build/three.module.min.js': 'three/three.module.min.js',
  'three/build/three.core.min.js': 'three/three.core.min.js',
  'three/examples/jsm/controls/OrbitControls.js': 'three/addons/controls/OrbitControls.js',
  'three/examples/jsm/exporters/OBJExporter.js': 'three/addons/exporters/OBJExporter.js',
  'three/examples/jsm/exporters/GLTFExporter.js': 'three/addons/exporters/GLTFExporter.js',
  'three/examples/jsm/objects/Reflector.js': 'three/addons/objects/Reflector.js',
  'react/umd/react.production.min.js': 'react/react.production.min.js',
  'react-dom/umd/react-dom.production.min.js': 'react/react-dom.production.min.js',
};
for (const [from, to] of Object.entries(vendorFiles)) {
  mkdirSync(dirname(join(vendor, to)), { recursive: true });
  copyFileSync(join(nm, from), join(vendor, to));
}

/* ---- rewrite embeds --------------------------------------------------------- */
const V = '../vendor';
const rewrites = [
  [/https:\/\/unpkg\.com\/three@[\d.]+\/build\/three\.(module|core)\.js/g, `${V}/three/three.$1.min.js`],
  [/\.\.\/vendor\/three\/three\.(module|core)\.js/g, `${V}/three/three.$1.min.js`],
  [/https:\/\/unpkg\.com\/three@[\d.]+\/examples\/jsm\//g, `${V}/three/addons/`],
  [/https:\/\/esm\.sh\/three@[\d.]+\/examples\/jsm\//g, `${V}/three/addons/`],
  [/https:\/\/esm\.sh\/three@[\d.]+(?=['"])/g, `${V}/three/three.module.min.js`],
  [/https:\/\/unpkg\.com\/react@[\d.]+\/umd\/react\.production\.min\.js/g, `${V}/react/react.production.min.js`],
  [/https:\/\/unpkg\.com\/react-dom@[\d.]+\/umd\/react-dom\.production\.min\.js/g, `${V}/react/react-dom.production.min.js`],
];

for (const file of readdirSync(embeds).filter((f) => f.endsWith('.html'))) {
  const path = join(embeds, file);
  let html = readFileSync(path, 'utf8');
  const before = html;
  for (const [re, to] of rewrites) html = html.replace(re, to);

  /* JSX: compile every text/babel block (in order) into one deferred classic script.
   * Deferred scripts run after module scripts, as Babel's did, and share globals. */
  const blocks = [...html.matchAll(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/g)];
  if (blocks.length) {
    const js = blocks.map((m) => transformSync(m[1], { loader: 'jsx', jsx: 'transform', target: 'es2020', minify: true }).code).join(';\n');
    const out = basename(file, '.html') + '.app.js';
    writeFileSync(join(embeds, out), js);
    html = html.replace(blocks[0][0], `<script defer src="${out}"></script>`);
    for (const m of blocks.slice(1)) html = html.replace(m[0], '');
    html = html.replace(/\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]*"><\/script>/, '');
  }

  /* Addons import the bare specifier "three": give pages without an import map one. */
  if (html.includes(`${V}/three/addons/`) && !html.includes('type="importmap"')) {
    html = html.replace(/<head>/i, `<head>\n<script type="importmap">{"imports":{"three":"${V}/three/three.module.min.js"}}</script>`);
  }

  /* Import-map integrity hashes must match the self-hosted files. */
  html = html.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/, (all, open, json, close) => {
    const map = JSON.parse(json);
    if (!map.integrity) return all;
    const urls = new Set([...Object.values(map.imports), `${V}/three/three.core.min.js`].filter((u) => u.startsWith(V)));
    map.integrity = Object.fromEntries([...urls].map((u) => [u, 'sha384-' + createHash('sha384').update(readFileSync(join(embeds, u))).digest('base64')]));
    return open + '\n' + JSON.stringify(map, null, 2) + '\n' + close;
  });

  if (html !== before) { writeFileSync(path, html); console.log('optimized', file); }
}
