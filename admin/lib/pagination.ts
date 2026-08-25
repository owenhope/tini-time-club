export const PER_PAGE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PER_PAGE = 50;

export interface PaginationSearchParams {
  page?: string;
  per?: string;
}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export const parsePage = (value?: string): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const parsePerPage = (value?: string): number =>
  PER_PAGE_OPTIONS.includes(Number(value) as (typeof PER_PAGE_OPTIONS)[number])
    ? Number(value)
    : DEFAULT_PER_PAGE;

export const parsePagination = (
  params: PaginationSearchParams
): PaginationParams => ({
  page: parsePage(params.page),
  perPage: parsePerPage(params.per),
});
