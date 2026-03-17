export default function WikiPageLoading() {
  return (
    <div className="mx-auto max-w-[800px]">
      {/* Header: breadcrumbs + title + edit button */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          {/* Breadcrumbs skeleton */}
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
            <span className="text-muted-foreground/30">/</span>
            <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          </div>
          {/* Title skeleton */}
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        {/* Edit button skeleton */}
        <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Content paragraphs skeleton */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Prev/Next skeleton */}
      <div className="mt-12 flex items-center justify-between border-t pt-6">
        <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
