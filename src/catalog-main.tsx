import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CatalogPage from './catalog/CatalogPage';
import './catalog/catalog.css';

createRoot(document.getElementById('catalog-root')!).render(<StrictMode><CatalogPage /></StrictMode>);
