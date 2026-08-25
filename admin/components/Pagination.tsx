import Link from "next/link";
import { PER_PAGE_OPTIONS, parsePerPage } from "@/lib/pagination";

export {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  parsePerPage,
} from "@/lib/pagination";

/**
 * Shared table pagination: count, page-size links, previous/next. URL-based
 * so multiple tables on one page paginate independently via their own
 * param names; `baseQuery` carries the other table's params along.
 */
export default function Pagination({
  path,
  baseQuery = "",
  pageParam,
  perParam,
  page,
  perPage,
  total,
  noun,
}: {
  path: string;
  baseQuery?: string;
  pageParam: string;
  perParam: string;
  page: number;
  perPage: number;
  total: number;
  noun: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const url = (p: number, per: number) =>
    `${path}?${baseQuery ? `${baseQuery}&` : ""}${pageParam}=${p}&${perParam}=${per}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3 text-sm text-stone-500">
      <span>
        {total.toLocaleString()} {noun} · page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-400">
            Per page
          </span>
          {PER_PAGE_OPTIONS.map((option) => (
            <Link
              key={option}
              href={url(1, option)}
              className={`rounded px-1.5 py-0.5 ${
                option === perPage
                  ? "bg-emerald-900 font-semibold text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {option}
            </Link>
          ))}
        </span>
        <span className="flex gap-2">
          {page > 1 ? (
            <Link
              href={url(page - 1, perPage)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1 font-medium text-stone-600 hover:bg-stone-100"
            >
              ← Prev
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={url(page + 1, perPage)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1 font-medium text-stone-600 hover:bg-stone-100"
            >
              Next →
            </Link>
          ) : null}
        </span>
      </div>
    </div>
  );
}
