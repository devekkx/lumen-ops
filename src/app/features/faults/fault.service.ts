import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { GenericCollectionService } from '@shared/services/generic-collection.service';
import { Page, PageRequest, createPageRequest } from '@shared/models/pagination';
import { MatchMode } from '@shared/models/filter';
import { condition } from '@shared/utils/filters';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FaultStatus = 'REPORTED' | 'VALIDATED' | 'IN_PROGRESS' | 'CLOSED' | 'REJECTED';
export type ReportedBy = 'CITIZEN' | 'INSPECTOR';

export const SEVERITIES: readonly Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const FAULT_STATUSES: readonly FaultStatus[] = [
	'REPORTED',
	'VALIDATED',
	'IN_PROGRESS',
	'CLOSED',
	'REJECTED'
];

export interface Fault {
	id: string;
	code: string;
	luminaireId: string;
	luminaireCode: string;
	street: string;
	zoneId: string;
	zone: string;
	severity: Severity;
	status: FaultStatus;
	reportedBy: ReportedBy;
	reportedAt: string;
	dueAt: string;
	description: string;
	photos: number;
}

export const FAULT_SEARCH_KEYS = ['code', 'street', 'description'] as const;

@Injectable({ providedIn: 'root' })
export class FaultService implements GenericCollectionService<Fault> {
	private readonly _api = inject(ApiService);

	public page(request: PageRequest): Observable<Page<Fault>> {
		return this._api.post<Page<Fault>>('/api/faults/paged', request);
	}

	/* There is no GET /api/faults/:id on the mock - only luminaires got that
	   single-record route - so the edit form's lookup goes through the same
	   paged endpoint everything else uses, filtered down to one id. */
	public get(id: string): Observable<Fault> {
		const request: PageRequest = createPageRequest([], { property: 'code', direction: 'ASC' });
		request.perPage = 1;
		request.filters = [condition('id', MatchMode.EQUAL, id)];

		return this._api.post<Page<Fault>>('/api/faults/paged', request).pipe(
			map((page) => {
				const [fault] = page.data;
				if (!fault) throw new Error('FAULT_NOT_FOUND');
				return fault;
			})
		);
	}

	/* POST for a new fault (no id yet), PUT to update an existing one - the
	   mock's two routes mirror that split exactly, so there is no need for a
	   third "upsert" endpoint on the server. */
	public save(model: Fault): Observable<Fault> {
		if (!model.id) {
			return this._api.post<Fault>('/api/faults', model);
		}
		return this._api.put<Fault>(`/api/faults/${model.id}`, model);
	}

	public delete(id: string): Observable<void> {
		return this._api.delete<void>(`/api/faults/${id}`);
	}

	/* Not part of GenericCollectionService - validate/reject/close are lifecycle
	   moves, not a generic save, and the mock models them as their own route so
	   validating can create a work order server-side as a side effect. */
	public transition(id: string, status: FaultStatus): Observable<Fault> {
		return this._api.post<Fault>(`/api/faults/${id}/transition`, { status });
	}
}
