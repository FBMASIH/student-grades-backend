export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    totalItems?: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
