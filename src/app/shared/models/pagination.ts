import { Filters } from './filter';

export interface Ordination {
	property: string;
	direction: 'ASC' | 'DESC';
}

export interface PageRequest {
	page: number;
	perPage: number;
	searchTerm: string;
	searchKeys: string[];
	ordination: Ordination;
	filters: Filters;
}

export interface Page<T> {
	data: T[];
	currentPage: number;
	lastPage: number;
	total: number;
	perPage: number;
}

export const createPageRequest = (
	searchKeys: readonly string[],
	ordination: Ordination
): PageRequest => ({
	page: 1,
	perPage: 20,
	searchTerm: '',
	searchKeys: [...searchKeys],
	ordination,
	filters: []
});
