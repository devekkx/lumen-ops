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

export abstract class PaginatedTableBaseV2<T> {
	protected abstract readonly collection: GenericCollectionService<T>;

	private readonly _searchKeys: readonly string[];
	private readonly _params: WritableSignal<TableParams>;
	private readonly _filterRecord = signal<FilterRecord>({});

	private readonly _rawRequest: Signal<PageRequest>;
	private readonly _debouncedRequest: Signal<PageRequest | undefined>;

	private readonly _lastGoodPage: WritableSignal<Page<T>>;

	private readonly _dataResource: ResourceRef<Page<T>>;

	public readonly page: Signal<Page<T>>;
	public readonly loading: Signal<boolean>;
	public readonly error: Signal<string | null>;

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

	public get filters(): FilterRecord {
		return this._filterRecord();
	}

	public get sortProperty(): string {
		return this._params().ordination.property;
	}

	public get sortDirection(): Ordination['direction'] {
		return this._params().ordination.direction;
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

	/* A run of OR-chained conditions is not expressible from a flat form record, so this takes the
	 * raw record and builds it fresh on every fetch - same contract as v1's setFilters. */
	public setFilters(record: FilterRecord): void {
		this._filterRecord.set(record);
		this._update({ page: 1 });
	}

	public sortBy(property: string): void {
		const current = this._params().ordination;
		const direction: Ordination['direction'] =
			current.property === property && current.direction === 'ASC' ? 'DESC' : 'ASC';
		this._update({ ordination: { property, direction } });
	}

	/* Unlike v1's refresh() - which re-emits a content-identical params object that
	 * combineLatest's own distinctUntilChanged then filters straight back out as a duplicate,
	 * silently no-op'ing whenever nothing else has changed - resource()'s reload() carries its
	 * own counter independent of the request value, so it always forces a real refetch of the
	 * same request. */
	public refresh(): void {
		this._dataResource.reload();
	}

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
