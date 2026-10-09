import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {globeBootstrap} from './scripts/globe-bootstrap.mjs';
export default defineConfig({plugins:[react(),{name:"globe-bootstrap",transformIndexHtml:html=>html.replace('<div id="root"></div>','<div id="root">'+globeBootstrap()+'</div>')}],server:{host:'127.0.0.1',port:5173},preview:{host:'127.0.0.1',port:4173},build:{chunkSizeWarningLimit:1200,rolldownOptions:{input:{globe:'index.html',catalog:'catalog.html',playground:'playground.html',portrait:'tools/portrait-studio.html'}}}});
