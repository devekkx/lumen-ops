import {
	Component,
	EnvironmentInjector,
	InjectionToken,
	inject,
	resource,
	signal
} from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { Page, PageRequest } from '../models/pagination';
import { GenericCollectionService } from '../services/generic-collection.service';
import { PaginatedTableBaseV2 } from './paginated-table.base';

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

/* A collection whose page() is a "real" Observable — a bare setTimeout, not
   `of(...).pipe(delay(...))` — so unsubscribing it early is observable: 'slow' only ever reaches
   `completed` if nothing tore it down first. That is the thing v1's spec didn't need to prove
   (switchMap's unsubscribe is automatic on any Observable) and v2's does: resource()'s own
   cancellation is a state-level guarantee, not a request-level one (see the second `it` below). */
class FakeCollection implements GenericCollectionService<Row> {
	readonly requests: PageRequest[] = [];
	readonly completed: string[] = [];
	readonly unsubscribed: string[] = [];

	page(request: PageRequest): Observable<Page<Row>> {
		this.requests.push(request);
		const term = request.searchTerm || 'none';
		const ms = term === 'slow' ? 500 : 50;
		return new Observable<Page<Row>>((subscriber) => {
			const timer = setTimeout(() => {
				this.completed.push(term);
				subscriber.next(pageOf(term));
				subscriber.complete();
			}, ms);
			return () => {
				clearTimeout(timer);
				this.unsubscribed.push(term);
			};
		});
	}
}

const ROW_COLLECTION = new InjectionToken<GenericCollectionService<Row>>('ROW_COLLECTION');

@Component({ selector: 'lumen-test-table', standalone: true, template: '' })
class TestTableComponent extends PaginatedTableBaseV2<Row> {
	protected readonly collection = inject(ROW_COLLECTION);

	constructor() {
		super(['label'], { property: 'label', direction: 'ASC' });
	}
}

describe('PaginatedTableBaseV2', () => {
	let collection: FakeCollection;

	beforeEach(() => {
		collection = new FakeCollection();
		TestBed.configureTestingModule({
			providers: [{ provide: ROW_COLLECTION, useValue: collection }]
		});
	});

	/* The v2 equivalent of v1's "switchMap beats mergeMap" proof: fire a slow request, then a fast
	   one that supersedes it before the slow one would resolve, and confirm the slow response
	   never reaches the screen — AND that the slow request was actually torn down rather than
	   left running to complete in the background, wastefully, only to be discarded. The second
	   assertion is the one resource() does not give for free; see `fetch()` in
	   paginated-table.base.ts for the abortSignal wiring that earns it. */
	it('cancels a slower in-flight request once a newer one supersedes it', fakeAsync(() => {
		const fixture = TestBed.createComponent(TestTableComponent);
		const table = fixture.componentInstance;
		fixture.detectChanges();

		table.setSearch('slow');
		fixture.detectChanges();
		tick(250); // debounce fires; the 500ms 'slow' request is now in flight
		fixture.detectChanges(); // flush the resource's loadEffect so it actually starts the request

		tick(100); // still mid-flight
		table.setSearch('fast');
		fixture.detectChanges();
		tick(250); // debounce fires again; 'slow' is aborted, 'fast' starts
		fixture.detectChanges();
		tick(50); // 'fast' resolves (50ms)
		fixture.detectChanges();

		/* 100 + 250 + 50 = 400ms since 'slow' started — under its 500ms delay. Advancing well past that
		   proves its late arrival is discarded rather than merely not-yet-checked. */
		tick(500);
		fixture.detectChanges();

		expect(table.page().data[0].label).toBe('fast');
		expect(collection.unsubscribed).toContain('slow');
		expect(collection.completed).not.toContain('slow');
	}));

	/* Isolates exactly what resource() gives for free, independent of our fetch() wiring: even a
	   loader that never looks at abortSignal cannot have a superseded resolution win, because
	   resource() checks the request identity (not just the signal) when the promise settles and
	   discards a stale one unconditionally. This is the "free" half of cancellation; the spec
	   above is the half that is not. */
	it('discards a stale resolution from a loader that ignores the abort signal', fakeAsync(() => {
		let injector!: EnvironmentInjector;
		TestBed.runInInjectionContext(() => {
			injector = inject(EnvironmentInjector);
		});

		const request = signal('slow');
		const res = TestBed.runInInjectionContext(() =>
			resource<string, string>({
				injector,
				request: () => request(),
				defaultValue: 'none',
				loader: ({ request: term }) =>
					new Promise<string>((resolvePromise) => {
						const ms = term === 'slow' ? 500 : 50;
						setTimeout(() => resolvePromise(term), ms);
					})
			})
		);

		TestBed.flushEffects();
		tick(100);
		request.set('fast');
		TestBed.flushEffects();
		tick(50);
		TestBed.flushEffects();

		expect(res.value()).toBe('fast');

		tick(500); // 'slow's own 500ms timer fires here — its resolution must still be ignored
		TestBed.flushEffects();

		expect(res.value()).toBe('fast');
	}));

	it('keeps the previous rows visible (loading true) while a request is in flight', fakeAsync(() => {
		const fixture = TestBed.createComponent(TestTableComponent);
		const table = fixture.componentInstance;
		fixture.detectChanges();
		tick(250);
		fixture.detectChanges();
		tick(50);
		fixture.detectChanges();
		expect(table.page().data[0].label).toBe('none');

		table.setSearch('anything');
		fixture.detectChanges();
		tick(250);
		fixture.detectChanges();

		expect(table.loading()).toBe(true);
		expect(table.page().data[0].label).toBe('none'); // still the previous page, not cleared to empty

		tick(50);
		fixture.detectChanges();

		expect(table.loading()).toBe(false);
		expect(table.page().data[0].label).toBe('anything');
	}));

	/* An error must not leave the previous page's rows on screen with no indication — the base
	   swaps in an empty page (shaped to the request that failed) and a translation key, same
	   contract as v1. */
	it('surfaces a translated error and an empty page rather than a stale one', fakeAsync(() => {
		const failing: GenericCollectionService<Row> = {
			page: (request) =>
				new Observable((subscriber) => {
					const timer = setTimeout(() => subscriber.error(new Error('boom')), 10);
					return () => clearTimeout(timer);
				})
		};
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ providers: [{ provide: ROW_COLLECTION, useValue: failing }] });

		const fixture = TestBed.createComponent(TestTableComponent);
		const table = fixture.componentInstance;
		fixture.detectChanges();
		tick(250);
		fixture.detectChanges();
		tick(10);
		fixture.detectChanges();

		expect(table.error()).toBe('table.error');
		expect(table.page().data).toEqual([]);
		expect(table.loading()).toBe(false);
	}));

	it('resets to page 1 when the search term or the filters change', fakeAsync(() => {
		const fixture = TestBed.createComponent(TestTableComponent);
		const table = fixture.componentInstance;
		fixture.detectChanges();
		tick(250);
		fixture.detectChanges();
		tick(50);
		fixture.detectChanges();

		table.setPage(3);
		fixture.detectChanges();
		tick(260);
		fixture.detectChanges();
		tick(50);
		fixture.detectChanges();

		table.setSearch('mayor');
		fixture.detectChanges();
		tick(260);
		fixture.detectChanges();
		tick(50);
		fixture.detectChanges();

		expect(collection.requests.at(-1)?.page).toBe(1);
	}));
});
