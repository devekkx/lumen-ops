import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { GenericCollectionService } from '@shared/services/generic-collection.service';
import { Page, PageRequest } from '@shared/models/pagination';

export type OrderStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE';

export const ORDER_STATUSES: readonly OrderStatus[] = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'DONE'];

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

export interface WorkOrderPatch {
	crewId?: string;
	status?: OrderStatus;
	scheduledAt?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkOrderService implements GenericCollectionService<WorkOrder> {
	private readonly _api = inject(ApiService);

	public page(request: PageRequest): Observable<Page<WorkOrder>> {
		return this._api.post<Page<WorkOrder>>('/api/work-orders/paged', request);
	}

	/* Not part of GenericCollectionService - a work order is never created or
	   replaced wholesale by this screen, only patched: assigning a crew or
	   moving its status is a lifecycle step, not a generic save. */
	public patch(id: string, changes: WorkOrderPatch): Observable<WorkOrder> {
		return this._api.patch<WorkOrder>(`/api/work-orders/${id}`, changes);
	}

	public assignCrew(orderId: string, crewId: string): Observable<WorkOrder> {
		return this.patch(orderId, { crewId });
	}

	public updateStatus(orderId: string, status: OrderStatus): Observable<WorkOrder> {
		return this.patch(orderId, { status });
	}
}
