import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { GenericCollectionService } from '@shared/services/generic-collection.service';
import { Page, PageRequest } from '@shared/models/pagination';

/* Mirrors mock-api/seed.ts's WorkOrder shape independently rather than
   importing it - same convention as fault.service.ts and luminaire.service.ts:
   the contract is the wire payload, not shared code across the mock/app
   boundary. */
export type OrderStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE';

export const ORDER_STATUSES: readonly OrderStatus[] = [
	'DRAFT',
	'ASSIGNED',
	'IN_PROGRESS',
	'DONE'
];

/* Only the statuses a crew still has open work for - DONE orders are no
   longer anyone's load. Used both to gate the Start/Complete actions and to
   compute the crew load indicator on the crews page. */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS'];

export interface WorkOrder {
	id: string;
	code: string;
	faultId: string;
	faultCode: string;
	luminaireCode: string;
	severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	crewId: string | null;
	crewCode: string | null;
	crewName: string | null;
	contractor: string | null;
	zoneId: string;
	zone: string;
	status: OrderStatus;
	scheduledAt: string;
	closedAt: string | null;
	hours: number;
	cost: number;
}

export const WORK_ORDER_SEARCH_KEYS = ['code', 'faultCode', 'luminaireCode'] as const;

/* The fields PATCH /api/work-orders/:id actually reads off its body (see the
   route handler in mock-api/server.ts) - crewId, status and scheduledAt, each
   optional and applied independently. Assigning a crew to a DRAFT order also
   moves it to ASSIGNED server-side; that side effect lives in the mock, not
   here. */
export interface WorkOrderPatch {
	crewId?: string;
	status?: OrderStatus;
	scheduledAt?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkOrderService implements GenericCollectionService<WorkOrder> {
	private readonly api = inject(ApiService);

	page(request: PageRequest): Observable<Page<WorkOrder>> {
		return this.api.post<Page<WorkOrder>>('/api/work-orders/paged', request);
	}

	/* Not part of GenericCollectionService - a work order is never created or
	   replaced wholesale by this screen, only patched: assigning a crew or
	   moving its status is a lifecycle step, not a generic save. */
	patch(id: string, changes: WorkOrderPatch): Observable<WorkOrder> {
		return this.api.patch<WorkOrder>(`/api/work-orders/${id}`, changes);
	}

	assignCrew(orderId: string, crewId: string): Observable<WorkOrder> {
		return this.patch(orderId, { crewId });
	}

	updateStatus(orderId: string, status: OrderStatus): Observable<WorkOrder> {
		return this.patch(orderId, { status });
	}
}
