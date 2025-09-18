import { PaginationMeta } from '../interfaces/pagination.interface';

export function buildPaginationMeta(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number,
  itemCount?: number,
): PaginationMeta {
  const safePage = Math.max(currentPage || 1, 1);
  const safeLimit = Math.max(itemsPerPage || 0, 0);
  const safeItemCount =
    typeof itemCount === 'number' ? itemCount : Math.min(safeLimit, totalItems);
  const totalPages = safeLimit > 0 ? Math.ceil(totalItems / safeLimit) : 1;

  return {
    totalItems,
    itemCount: safeLimit === 0 ? totalItems : safeItemCount,
    itemsPerPage: safeLimit,
    totalPages,
    currentPage:
      totalPages === 0 ? 1 : Math.min(safePage, Math.max(totalPages, 1)),
  };
}
