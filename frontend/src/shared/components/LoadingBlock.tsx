interface LoadingBlockProps {
  label?: string;
  message?: string;
}

export function LoadingBlock({ label, message }: LoadingBlockProps) {
  const text = message ?? label ?? 'Đang tải...';
  return (
    <div className="loading-block" role="status">
      <span className="spinner spinner-lg" />
      <span>{text}</span>
    </div>
  );
}
