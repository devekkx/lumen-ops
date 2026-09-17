import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { GenericCollectionService } from '@shared/services/generic-collection.service';
import { Page, PageRequest } from '@shared/models/pagination';

export type Shift = 'DAY' | 'NIGHT';

export const SHIFTS: readonly Shift[] = ['DAY', 'NIGHT'];

export const CONTRACTORS: readonly string[] = ['Iluminia Servicios', 'ElectroMadrid UTE'];

export interface Crew {
	id: string;
	code: string;
	name: string;
	contractor: string;
	members: number;
	zoneId: string;
	zone: string;
	shift: Shift;
}

export type CrewPatch = Pick<Crew, 'name' | 'contractor' | 'members' | 'shift'>;

export const CREW_SEARCH_KEYS = ['code', 'name', 'contractor', 'zone'] as const;

@Injectable({ providedIn: 'root' })
export class CrewService implements GenericCollectionService<Crew> {
	private readonly _api = inject(ApiService);

	page(request: PageRequest): Observable<Page<Crew>> {
		return this._api.post<Page<Crew>>('/api/crews/paged', request);
	}

	/* The full, unpaged crew list - GET /api/crews - for pickers like the
	   assign-crew dialog, which needs every crew at once rather than one page
	   of them. */
	list(): Observable<Crew[]> {
		return this._api.get<Crew[]>('/api/crews');
	}

	/* Crews are edited in place, never created or deleted from this screen -
	   the roster is the contractors' real headcount for this contract, not a
	   collection an ADMIN session grows or shrinks. */
	update(id: string, patch: CrewPatch): Observable<Crew> {
		return this._api.patch<Crew>(`/api/crews/${id}`, patch);
	}
}
