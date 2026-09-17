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

/* The base class every paginated screen extends: search, sort, page, filter
 * and refresh, solved once so a concrete table adds only its own column
 * config and its own collection service.
 *
 * switchMap is the load-bearing choice on the fetch, not mergeMap: typing
 * quickly in the search box fires a new request per keystroke (after the
 * debounce), and only switchMap cancels the in-flight one rather than racing
 * it - see paginated-table.base.spec.ts for the case where a slower earlier
 * response would otherwise win and show a stale page.
 */
export abstract class PaginatedTableBase<T> {
	protected abstract readonly collection: GenericCollectionService<T>;

	private readonly _params: BehaviorSubject<PageRequest>;
	private readonly _filterRecord = new BehaviorSubject<FilterRecord>({});
	/* Bumped only by refresh(). distinctUntilChanged below compares the whole
	   tuple by JSON.stringify, so a refresh that changes nothing else -
	   { ...params.value } is a new object with identical contents - would
	   otherwise stringify equal to the previous emission and be silently
	   dropped before switchMap ever re-subscribes. This is the one field in
	   the tuple whose only job is to make "fetch again with the same params"
	   distinguishable from "nothing changed". */
	private readonly _refreshTick = new BehaviorSubject(0);

	readonly loading = new BehaviorSubject(false);
	readonly error = new BehaviorSubject<string | null>(null);
	readonly page$: Observable<Page<T>>;

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

	get filters(): FilterRecord {
		return this._filterRecord.value;
	}

	get sortProperty(): string {
		return this._params.value.ordination.property;
	}

	get sortDirection(): Ordination['direction'] {
		return this._params.value.ordination.direction;
	}

	setSearch(searchTerm: string): void {
		this._update({ searchTerm, page: 1 });
	}

	setPage(page: number): void {
		this._update({ page });
	}

	setPerPage(perPage: number): void {
		this._update({ perPage, page: 1 });
	}

	/* A run of OR-chained conditions is not expressible from a flat form
	   record, so this takes the raw record and builds it fresh on every
	   fetch - the DSL inspector reads the same built Filters back out. */
	setFilters(record: FilterRecord): void {
		this._filterRecord.next(record);
		this._update({ page: 1 });
	}

	sortBy(property: string): void {
		const current = this._params.value.ordination;
		const direction: Ordination['direction'] =
			current.property === property && current.direction === 'ASC' ? 'DESC' : 'ASC';
		this._update({ ordination: { property, direction } });
	}

	refresh(): void {
		this._refreshTick.next(this._refreshTick.value + 1);
	}

	private _update(change: Partial<PageRequest>): void {
		this._params.next({ ...this._params.value, ...change });
	}
}
