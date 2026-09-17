import {
	Signal,
	WritableSignal,
	ResourceRef,
	ResourceStatus,
	computed,
	effect,
	resource,
	signal
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FilterRecord } from '@shared/models/filter';
import { buildFilterConditions } from '@shared/utils/filters';
import { GenericCollectionService } from '../services/generic-collection.service';
import { Ordination, Page, PageRequest, createPageRequest } from '../models/pagination';

type TableParams = Pick<PageRequest, 'page' | 'perPage' | 'searchTerm' | 'ordination'>;

const emptyPageFor = <T>(shape: Pick<PageRequest, 'page' | 'perPage'>): Page<T> => ({
	data: [],
	currentPage: shape.page,
	lastPage: 1,
	total: 0,
	perPage: shape.perPage
});

/* Same job as ../components/paginated-table/paginated-table.base.ts - search, sort, page, filter
 * and refresh, solved once - rebuilt on signal()/computed()/resource() instead of
 * BehaviorSubject/combineLatest/switchMap. Same public surface (setSearch/setPage/setPerPage/
 * setFilters/sortBy/refresh, same 250ms debounce feel, same reset-to-page-1-on-search-or-filter-
 * change rule) so a concrete table's component code barely changes; only its template swaps
 * `x$ | async` for `x()`. See docs/table-v1-vs-v2.md for what changed and why.
 *
 * resource() has no debounce primitive of its own, so the 250ms feel is still bought with RxJS -
 * it just moves to sit around the *request* signal instead of around the fetch: rawRequest
 * (page/perPage/searchTerm/ordination plus the filter record, merged in one computed - this app
 * has no router-state or post-filter source to add as a third, and inventing one here would
 * misrepresent what v2 actually needed) is round-tripped through toObservable -> debounceTime ->
 * distinctUntilChanged -> toSignal, and resource() is keyed on *that* debounced signal, not on
 * rawRequest directly.
 */
export abstract class PaginatedTableBaseV2<T> {
	protected abstract readonly collection: GenericCollectionService<T>;

	private readonly _searchKeys: readonly string[];
	private readonly _params: WritableSignal<TableParams>;
	private readonly _filterRecord = signal<FilterRecord>({});

	private readonly _rawRequest: Signal<PageRequest>;
	/* Undefined until the first debounce window elapses - resource() reads an undefined request
	   as "no request yet" (status Idle, no fetch), which is exactly how v1 behaves too:
	   debounceTime delays even the very first combineLatest emission, so the first real fetch
	   only ever happens 250ms after construction, not before. Seeding this with an initial value
	   instead would make resource() fire an immediate first fetch AND a second, 250ms later, once
	   the debounced pipe finally emits that same (by-then-stale) initial request - starting as
	   plain `undefined` avoids that double fetch. */
	private readonly _debouncedRequest: Signal<PageRequest | undefined>;

	/* resource() clears value() to defaultValue the instant `request` changes - Loading is
	   documented to mean "value() will be undefined [or defaultValue]", by design, not a bug. v1
	   kept the previous rows on screen under a loading rail until the new page actually arrived
	   (shareReplay(1) never re-emitted an empty page just because a fetch started); this signal
	   plus the effect() below buy that same feel back - it's the one thing resource() doesn't
	   give for free that switchMap+shareReplay did. */
	private readonly _lastGoodPage: WritableSignal<Page<T>>;

	private readonly _dataResource: ResourceRef<Page<T>>;

	readonly page: Signal<Page<T>>;
	readonly loading: Signal<boolean>;
	readonly error: Signal<string | null>;

	protected constructor(searchKeys: readonly string[], defaultSort: Ordination) {
		this._searchKeys = [...searchKeys];
		const initial = createPageRequest(searchKeys, defaultSort);
		this._params = signal<TableParams>({
			page: initial.page,
			perPage: initial.perPage,
			searchTerm: initial.searchTerm,
			ordination: initial.ordination
		});

		this._rawRequest = computed<PageRequest>(() => ({
			...this._params(),
			searchKeys: [...this._searchKeys],
			filters: buildFilterConditions(this._filterRecord())
		}));

		this._debouncedRequest = toSignal(
			toObservable(this._rawRequest).pipe(
				debounceTime(250),
				distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
			)
		);

		this._lastGoodPage = signal(emptyPageFor<T>(this._rawRequest()));

		this._dataResource = resource({
			request: () => this._debouncedRequest(),
			/* `request!`, not a real nullability hole: with strictNullChecks on,
			   ResourceLoaderParams<R>['request'] is documented (and typed) as
			   `Exclude<R, undefined>`, but verified against the actual
			   @angular/core 19.2 types (see zzz-repro-style check run for this
			   survey), `Exclude<NoInfer<R>, undefined>` does not distribute over
			   `R = PageRequest | undefined` here and the inferred parameter type
			   still includes `undefined` - a TypeScript inference gap in
			   `NoInfer`'s interaction with `Exclude`, not something this file can
			   fix. resource() itself only ever invokes `loader` once its `request`
			   reactive function has produced a defined value (an undefined
			   request means status Idle, no fetch - same as v1 never firing its
			   first combineLatest emission before debounceTime elapses); the `!`
			   asserts that real, structural guarantee rather than papering over a
			   genuine gap. */
			loader: ({ request, abortSignal }) => this._fetch(request!, abortSignal),
			defaultValue: emptyPageFor<T>(this._rawRequest())
		});

		effect(() => {
			if (this._dataResource.status() === ResourceStatus.Resolved) {
				this._lastGoodPage.set(this._dataResource.value());
			}
		});

		this.page = computed(() => {
			const status = this._dataResource.status();
			/* An error must not leave the previous page's rows on screen with no indication -
			   same rule as v1, just read off resource()'s own status() rather than a catchError
			   swap-in. The rawRequest() fallback is defensive only: status() can never be Error
			   before a request has actually been made, so debouncedRequest() is never really
			   undefined by this point. */
			if (status === ResourceStatus.Error) {
				return emptyPageFor<T>(this._debouncedRequest() ?? this._rawRequest());
			}
			if (status === ResourceStatus.Resolved || status === ResourceStatus.Local) {
				return this._dataResource.value();
			}
			return this._lastGoodPage();
		});
		this.loading = this._dataResource.isLoading;
		this.error = computed(() =>
			this._dataResource.status() === ResourceStatus.Error ? 'table.error' : null
		);
	}

	get filters(): FilterRecord {
		return this._filterRecord();
	}

	get sortProperty(): string {
		return this._params().ordination.property;
	}

	get sortDirection(): Ordination['direction'] {
		return this._params().ordination.direction;
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

	/* A run of OR-chained conditions is not expressible from a flat form record, so this takes the
	   raw record and builds it fresh on every fetch - same contract as v1's setFilters. */
	setFilters(record: FilterRecord): void {
		this._filterRecord.set(record);
		this._update({ page: 1 });
	}

	sortBy(property: string): void {
		const current = this._params().ordination;
		const direction: Ordination['direction'] =
			current.property === property && current.direction === 'ASC' ? 'DESC' : 'ASC';
		this._update({ ordination: { property, direction } });
	}

	/* Unlike v1's refresh() - which re-emits a content-identical params object that
	   combineLatest's own distinctUntilChanged then filters straight back out as a duplicate,
	   silently no-op'ing whenever nothing else has changed - resource()'s reload() carries its
	   own counter independent of the request value, so it always forces a real refetch of the
	   same request. */
	refresh(): void {
		this._dataResource.reload();
	}

	/* resource()'s cancellation guarantees only that a superseded request's resolution can never
	   win the *state* (see paginated-table.base.spec.ts) - the underlying request itself keeps
	   running to completion unless something tears it down. GenericCollectionService hands back
	   an Observable, not a fetch() Promise, so there's no ambient AbortSignal wiring the way
	   there would be for `fetch`; this bridges the two by hand so a superseded request is
	   actually unsubscribed, not merely ignored. */
	private _fetch(request: PageRequest, abortSignal: AbortSignal): Promise<Page<T>> {
		return new Promise<Page<T>>((resolvePromise, reject) => {
			const subscription = this.collection.page(request).subscribe({
				next: (page) => resolvePromise(page),
				error: (err: unknown) => reject(err)
			});
			abortSignal.addEventListener('abort', () => subscription.unsubscribe(), { once: true });
		});
	}

	private _update(change: Partial<TableParams>): void {
		this._params.update((current) => ({ ...current, ...change }));
	}
}
