const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const timeOnly = new Intl.DateTimeFormat('vi-VN', { timeStyle: 'medium' });

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
export const formatTime = (iso: string): string => timeOnly.format(new Date(iso));

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const formatUsd = (value: number): string => `$${value.toFixed(6)}`;

export const formatPercent = (ratio: number): string => `${(ratio * 100).toFixed(1)}%`;
