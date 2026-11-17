import { Button } from './ui'

export function Pagination({
  page,
  pageCount,
  total,
  firstRow,
  lastRow,
  onPage,
}: {
  page: number
  pageCount: number
  total: number
  firstRow: number
  lastRow: number
  onPage: (page: number) => void
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-brand-muted">
      <p>
        {total === 0 ? 'No records' : `Showing ${firstRow}–${lastRow} of ${total}`}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
