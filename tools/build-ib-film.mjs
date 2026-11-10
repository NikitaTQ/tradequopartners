// IB Tools hero: tools/ib-film/ib-film.jsx → site/assets/js/ib-film.js (JSX compiled to React.createElement calls,
// minified; React and ReactDOM come from site/vendor as globals). Run after editing the source:
//   cd tools && node build-ib-film.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const src = new URL('./ib-film/ib-film.jsx', import.meta.url);
const out = new URL('../site/assets/js/ib-film.js', import.meta.url);
const { code } = transformSync(readFileSync(src, 'utf8'), { loader: 'jsx', jsx: 'transform', target: 'es2019', minify: true, legalComments: 'none' });
writeFileSync(out, '/* IB Tools hero film. Built from tools/ib-film/ib-film.jsx (node tools/build-ib-film.mjs); do not edit. */\n' + code);
console.log('site/assets/js/ib-film.js', code.length, 'bytes');
