import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CatalogPage from './catalog/CatalogPage';
import ArchiveRecordPage from './catalog/ArchiveRecordPage';
import './catalog/catalog.css';

const mount=document.getElementById('catalog-root')!;
createRoot(mount).render(<StrictMode>{mount.dataset.recordId?<ArchiveRecordPage id={mount.dataset.recordId}/>:<CatalogPage />}</StrictMode>);
