import {
	BehaviorSubject,
	Observable,
	catchError,
	combineLatest,
	debounceTime,
	distinctUntilChanged,
	finalize,
	of,
	shareReplay,
	switchMap,
	tap
} from 'rxjs';
import { FilterRecord } from '@shared/models/filter';
import { buildFilterConditions } from '@shared/utils/filters';
import { GenericCollectionService } from '../../services/generic-collection.service';
import { Ordination, Page, PageRequest, createPageRequest } from '../../models/pagination';

export abstract class PaginatedTableBase<T> {
	protected abstract readonly collection: GenericCollectionService<T>;

	private readonly _params: BehaviorSubject<PageRequest>;
	private readonly _filterRecord = new BehaviorSubject<FilterRecord>({});
	private readonly _refreshTick = new BehaviorSubject(0);

	public readonly loading = new BehaviorSubject(false);
	public readonly error = new BehaviorSubject<string | null>(null);
	public readonly page$: Observable<Page<T>>;

	protected constructor(searchKeys: readonly string[], defaultSort: Ordination) {
		this._params = new BehaviorSubject<PageRequest>(createPageRequest(searchKeys, defaultSort));

		this.page$ = combineLatest([this._params, this._filterRecord, this._refreshTick]).pipe(
			debounceTime(250),
			distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
			tap(() => {
				this.loading.next(true);
				this.error.next(null);
			}),
			switchMap(([params, record]) => {
				const request: PageRequest = { ...params, filters: buildFilterConditions(record) };
				return this.collection.page(request).pipe(
					catchError(() => {
						this.error.next('table.error');
						return of<Page<T>>({
							data: [],
							currentPage: request.page,
							lastPage: 1,
							total: 0,
							perPage: request.perPage
						});
					}),
					finalize(() => this.loading.next(false))
				);
			}),
			shareReplay({ bufferSize: 1, refCount: true })
		);
	}

	public get filters(): FilterRecord {
		return this._filterRecord.value;
	}

	public get sortProperty(): string {
		return this._params.value.ordination.property;
	}

	public get sortDirection(): Ordination['direction'] {
		return this._params.value.ordination.direction;
	}

	public setSearch(searchTerm: string): void {
		this._update({ searchTerm, page: 1 });
	}

	public setPage(page: number): void {
		this._update({ page });
	}

	public setPerPage(perPage: number): void {
		this._update({ perPage, page: 1 });
	}

	/* A run of OR-chained conditions is not expressible from a flat form
	   record, so this takes the raw record and builds it fresh on every
	   fetch - the DSL inspector reads the same built Filters back out. */
	public setFilters(record: FilterRecord): void {
		this._filterRecord.next(record);
		this._update({ page: 1 });
	}

	public sortBy(property: string): void {
		const current = this._params.value.ordination;
		const direction: Ordination['direction'] =
			current.property === property && current.direction === 'ASC' ? 'DESC' : 'ASC';
		this._update({ ordination: { property, direction } });
	}

	public refresh(): void {
		this._refreshTick.next(this._refreshTick.value + 1);
	}

	private _update(change: Partial<PageRequest>): void {
		this._params.next({ ...this._params.value, ...change });
	}
}
