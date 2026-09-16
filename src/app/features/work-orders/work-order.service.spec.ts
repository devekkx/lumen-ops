import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createPageRequest } from '@shared/models/pagination';
import { WorkOrder, WorkOrderService } from './work-order.service';

const order: WorkOrder = {
	id: 'wo-1',
	code: 'OT-0001',
	faultId: 'fault-1',
	faultCode: 'AVR-0001',
	luminaireCode: 'LUM-0001',
	severity: 'HIGH',
	crewId: null,
	crewCode: null,
	crewName: null,
	contractor: null,
	zoneId: 'z1',
	zone: 'Centro',
	status: 'DRAFT',
	scheduledAt: '2024-01-03T00:00:00.000Z',
	closedAt: null,
	hours: 0,
	cost: 0
};

const emptyPage = { data: [], currentPage: 1, lastPage: 1, total: 0, perPage: 20 };

describe('WorkOrderService', () => {
	let service: WorkOrderService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(WorkOrderService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('POSTs the full envelope to /api/work-orders/paged rather than a query string', () => {
		const request = createPageRequest(['code', 'faultCode', 'luminaireCode'], {
			property: 'scheduledAt',
			direction: 'ASC'
		});
		service.page(request).subscribe();

		const testRequest = http.expectOne('/api/work-orders/paged');
		expect(testRequest.request.method).toBe('POST');
		expect(testRequest.request.body).toEqual(request);
		testRequest.flush(emptyPage);
	});

	describe('patch(id, changes)', () => {
		it('PATCHes only the fields it is given', () => {
			service.patch('wo-1', { crewId: 'crew-01' }).subscribe();

			const testRequest = http.expectOne('/api/work-orders/wo-1');
			expect(testRequest.request.method).toBe('PATCH');
			expect(testRequest.request.body).toEqual({ crewId: 'crew-01' });
			testRequest.flush(order);
		});
	});

	it('assignCrew() PATCHes { crewId }', () => {
		service.assignCrew('wo-1', 'crew-01').subscribe();

		const testRequest = http.expectOne('/api/work-orders/wo-1');
		expect(testRequest.request.method).toBe('PATCH');
		expect(testRequest.request.body).toEqual({ crewId: 'crew-01' });
		testRequest.flush({ ...order, crewId: 'crew-01' });
	});

	it('updateStatus() PATCHes { status }', () => {
		service.updateStatus('wo-1', 'IN_PROGRESS').subscribe();

		const testRequest = http.expectOne('/api/work-orders/wo-1');
		expect(testRequest.request.method).toBe('PATCH');
		expect(testRequest.request.body).toEqual({ status: 'IN_PROGRESS' });
		testRequest.flush({ ...order, status: 'IN_PROGRESS' });
	});
});
