import type { ReactNode } from 'react';
import './research-record.css';

export default function RecordActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`detail-record-actions ${className}`}>{children}</div>;
}
