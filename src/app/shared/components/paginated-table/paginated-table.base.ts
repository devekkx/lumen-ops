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
 * it — see paginated-table.base.spec.ts for the case where a slower earlier
 * response would otherwise win and show a stale page.
 */
export abstract class PaginatedTableBase<T> {
	protected abstract readonly collection: GenericCollectionService<T>;

	private readonly params: BehaviorSubject<PageRequest>;
	private readonly filterRecord = new BehaviorSubject<FilterRecord>({});
	/* Bumped only by refresh(). distinctUntilChanged below compares the whole
	   tuple by JSON.stringify, so a refresh that changes nothing else —
	   { ...params.value } is a new object with identical contents — would
	   otherwise stringify equal to the previous emission and be silently
	   dropped before switchMap ever re-subscribes. This is the one field in
	   the tuple whose only job is to make "fetch again with the same params"
	   distinguishable from "nothing changed". */
	private readonly refreshTick = new BehaviorSubject(0);

	readonly loading = new BehaviorSubject(false);
	readonly error = new BehaviorSubject<string | null>(null);
	readonly page$: Observable<Page<T>>;

	protected constructor(searchKeys: readonly string[], defaultSort: Ordination) {
		this.params = new BehaviorSubject<PageRequest>(createPageRequest(searchKeys, defaultSort));

		this.page$ = combineLatest([this.params, this.filterRecord, this.refreshTick]).pipe(
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
		return this.filterRecord.value;
	}

	get sortProperty(): string {
		return this.params.value.ordination.property;
	}

	get sortDirection(): Ordination['direction'] {
		return this.params.value.ordination.direction;
	}

	setSearch(searchTerm: string): void {
		this.update({ searchTerm, page: 1 });
	}

	setPage(page: number): void {
		this.update({ page });
	}

	setPerPage(perPage: number): void {
		this.update({ perPage, page: 1 });
	}

	/* A run of OR-chained conditions is not expressible from a flat form
	   record, so this takes the raw record and builds it fresh on every
	   fetch — the DSL inspector reads the same built Filters back out. */
	setFilters(record: FilterRecord): void {
		this.filterRecord.next(record);
		this.update({ page: 1 });
	}

	sortBy(property: string): void {
		const current = this.params.value.ordination;
		const direction: Ordination['direction'] =
			current.property === property && current.direction === 'ASC' ? 'DESC' : 'ASC';
		this.update({ ordination: { property, direction } });
	}

	refresh(): void {
		this.refreshTick.next(this.refreshTick.value + 1);
	}

	private update(change: Partial<PageRequest>): void {
		this.params.next({ ...this.params.value, ...change });
	}
}
