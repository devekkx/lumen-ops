import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, delay, of, throwError } from 'rxjs';
import { Page, PageRequest } from '../../models/pagination';
import { GenericCollectionService } from '../../services/generic-collection.service';
import { PaginatedTableBase } from './paginated-table.base';

interface Row {
	id: string;
	label: string;
}

const pageOf = (label: string): Page<Row> => ({
	data: [{ id: '1', label }],
	currentPage: 1,
	lastPage: 1,
	total: 1,
	perPage: 20
});

class FakeCollection implements GenericCollectionService<Row> {
	readonly requests: PageRequest[] = [];

	page(request: PageRequest): Observable<Page<Row>> {
		this.requests.push(request);
		/* 'slow' deliberately outlasts the second request below, so a result
		   racing rather than cancelling would let it win last. */
		const ms = request.searchTerm === 'slow' ? 500 : 50;
		return of(pageOf(request.searchTerm || 'none')).pipe(delay(ms));
	}
}

class TestTable extends PaginatedTableBase<Row> {
	protected readonly collection: GenericCollectionService<Row>;

	constructor(collection: GenericCollectionService<Row>) {
		super(['label'], { property: 'label', direction: 'ASC' });
		this.collection = collection;
	}
}

describe('PaginatedTableBase', () => {
	/* The switchMap-vs-mergeMap proof the brief asks for: fire a slow request,
	   then a fast one that supersedes it before the slow one would resolve, and
	   confirm the slow response never reaches the screen. */
	it('cancels a slower in-flight request once a newer one supersedes it', fakeAsync(() => {
		const collection = new FakeCollection();
		const table = new TestTable(collection);
		let latest: Page<Row> | undefined;
		const subscription = table.page$.subscribe((page) => (latest = page));

		table.setSearch('slow');
		tick(250); // debounce fires; the 500ms 'slow' request is now in flight

		tick(100); // still mid-flight
		table.setSearch('fast');
		tick(250); // debounce fires again; switchMap drops 'slow' and starts 'fast'
		tick(50); // 'fast' resolves (50ms)

		/* 100 + 250 + 50 = 400ms since 'slow' started - under its 500ms delay.
		   Advancing well past that proves its late arrival is discarded rather
		   than merely not-yet-checked. */
		tick(500);

		expect(latest?.data[0].label).toBe('fast');
		subscription.unsubscribe();
	}));

	it('reports loading and clears it once the page resolves', fakeAsync(() => {
		const collection = new FakeCollection();
		const table = new TestTable(collection);
		table.page$.subscribe();

		table.setSearch('anything');
		tick(250);
		expect(table.loading.value).toBe(true);

		tick(50);
		expect(table.loading.value).toBe(false);
	}));

	/* An error must not leave the previous page's rows on screen with no
	   indication - the base swaps in an empty page and a translation key. */
	it('surfaces a translated error and an empty page rather than a stale one', fakeAsync(() => {
		let shouldFail = false;
		const collection: GenericCollectionService<Row> = {
			page: () =>
				(shouldFail ? throwError(() => new Error('boom')) : of(pageOf('ok'))).pipe(delay(10))
		};
		const table = new TestTable(collection);
		const pages: Page<Row>[] = [];
		table.page$.subscribe((page) => pages.push(page));

		tick(260);
		expect(pages.at(-1)?.data[0].label).toBe('ok');
		expect(table.error.value).toBeNull();

		shouldFail = true;
		table.refresh();
		tick(260);

		expect(table.error.value).toBe('table.error');
		expect(pages.at(-1)?.data).toEqual([]);
		expect(table.loading.value).toBe(false);
	}));

	it('resets to page 1 when the search term or the filters change', fakeAsync(() => {
		const collection = new FakeCollection();
		const table = new TestTable(collection);
		table.page$.subscribe();

		table.setPage(3);
		tick(260);
		table.setSearch('mayor');
		tick(260);

		expect(collection.requests.at(-1)?.page).toBe(1);
	}));

	/* Regression: refresh() used to re-emit { ...params.value } - a new object
	   with identical contents - which distinctUntilChanged's JSON.stringify
	   comparison treated as no change at all, so a refetch with the same
	   params (exactly what every write action in the faults list relies on
	   after a validate/reject/close/delete) silently never happened. */
	it('genuinely refetches on refresh(), even with identical params', fakeAsync(() => {
		const collection = new FakeCollection();
		const table = new TestTable(collection);
		table.page$.subscribe();
		tick(260);

		const before = collection.requests.length;
		table.refresh();
		tick(260);

		expect(collection.requests).toHaveSize(before + 1);
	}));
});
