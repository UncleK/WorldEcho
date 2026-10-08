import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{host:'127.0.0.1',port:5173},preview:{host:'127.0.0.1',port:4173},build:{chunkSizeWarningLimit:1200,rolldownOptions:{input:{globe:'index.html',catalog:'catalog.html',playground:'playground.html',portrait:'tools/portrait-studio.html'}}}});
