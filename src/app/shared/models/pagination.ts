export interface PageRequest { page: number; perPage: number; searchTerm: string; sort: string; direction: 'ASC' | 'DESC'; filters: unknown[]; }
export interface Page<T> { data: T[]; currentPage: number; lastPage: number; total: number; perPage: number; }
export const initialPageRequest: PageRequest = { page: 1, perPage: 20, searchTerm: '', sort: 'code', direction: 'ASC', filters: [] };
