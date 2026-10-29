interface PaginationProps {
  page?: number;
  currentPage?: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, currentPage, totalPages, total, onPageChange }: PaginationProps) {
  const activePage = currentPage ?? page ?? 1;
  if (totalPages <= 1 && (total === undefined || total === 0)) return null;

  return (
    <div className="pagination">
      <span>
        Trang {activePage}/{totalPages} {total !== undefined ? `· ${total} mục` : ''}
      </span>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={activePage <= 1}
        onClick={() => onPageChange(activePage - 1)}
      >
        ← Trước
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={activePage >= totalPages}
        onClick={() => onPageChange(activePage + 1)}
      >
        Sau →
      </button>
    </div>
  );
}
