import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createPageRequest } from '@shared/models/pagination';
import { Fault, FaultService } from './fault.service';

const fault: Fault = {
	id: 'fault-1',
	code: 'AVR-0001',
	luminaireId: 'lum-1',
	luminaireCode: 'LUM-0001',
	street: 'Calle Mayor',
	zoneId: 'z1',
	zone: 'Centro',
	severity: 'HIGH',
	status: 'REPORTED',
	reportedBy: 'CITIZEN',
	reportedAt: '2024-01-01T00:00:00.000Z',
	dueAt: '2024-01-08T00:00:00.000Z',
	description: 'A broken lamp',
	photos: 0
};

const emptyPage = { data: [], currentPage: 1, lastPage: 1, total: 0, perPage: 20 };

describe('FaultService', () => {
	let service: FaultService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(FaultService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('POSTs the full envelope to /api/faults/paged rather than a query string', () => {
		const request = createPageRequest(['code', 'street', 'description'], {
			property: 'reportedAt',
			direction: 'DESC'
		});
		service.page(request).subscribe();

		const testRequest = http.expectOne('/api/faults/paged');
		expect(testRequest.request.method).toBe('POST');
		expect(testRequest.request.body).toEqual(request);
		testRequest.flush(emptyPage);
	});

	describe('get(id)', () => {
		/* There is no GET /api/faults/:id on the mock, only on luminaires — see
		   fault.service.ts's comment on why get() goes through the paged
		   endpoint filtered to a single id instead. */
		it('filters the paged endpoint to one id rather than fetching a single record', () => {
			service.get('fault-1').subscribe((result) => expect(result).toEqual(fault));

			const testRequest = http.expectOne('/api/faults/paged');
			const [condition] = testRequest.request.body.filters;
			expect(condition.leftHand).toEqual({ type: 'STATIC', value: 'id' });
			expect(condition.matchMode).toBe('EQUAL');
			expect(condition.rightHand).toEqual({ type: 'CONTROL', value: 'fault-1' });

			testRequest.flush({ ...emptyPage, data: [fault], total: 1, perPage: 1 });
		});

		it('errors rather than resolving with undefined when nothing matches', () => {
			let error: unknown;
			service.get('missing').subscribe({ error: (err) => (error = err) });

			http.expectOne('/api/faults/paged').flush({ ...emptyPage, perPage: 1 });
			expect(error).toBeInstanceOf(Error);
		});
	});

	describe('save(model)', () => {
		it('POSTs a fault with no id yet', () => {
			service.save({ ...fault, id: '' }).subscribe();

			const testRequest = http.expectOne('/api/faults');
			expect(testRequest.request.method).toBe('POST');
			testRequest.flush(fault);
		});

		it('PUTs a fault that already has an id', () => {
			service.save(fault).subscribe();

			const testRequest = http.expectOne(`/api/faults/${fault.id}`);
			expect(testRequest.request.method).toBe('PUT');
			testRequest.flush(fault);
		});
	});

	it('delete() DELETEs by id', () => {
		service.delete('fault-1').subscribe();
		http.expectOne('/api/faults/fault-1').flush(null);
	});

	it('transition() POSTs the new status to the transition sub-route', () => {
		service.transition('fault-1', 'VALIDATED').subscribe();

		const testRequest = http.expectOne('/api/faults/fault-1/transition');
		expect(testRequest.request.method).toBe('POST');
		expect(testRequest.request.body).toEqual({ status: 'VALIDATED' });
		testRequest.flush(fault);
	});
});
