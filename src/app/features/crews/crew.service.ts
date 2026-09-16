import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { GenericCollectionService } from '@shared/services/generic-collection.service';
import { Page, PageRequest } from '@shared/models/pagination';

/* Mirrors mock-api/seed.ts's Crew shape independently rather than importing
   it — same convention as the other collection services. */
export type Shift = 'DAY' | 'NIGHT';

export const SHIFTS: readonly Shift[] = ['DAY', 'NIGHT'];

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

export const CREW_SEARCH_KEYS = ['code', 'name', 'contractor', 'zone'] as const;

/* Crews are a smaller, mostly-read collection: mock-api/server.ts has no
   POST/PUT/DELETE route for them, only GET /api/crews (a plain array, used by
   the assign-crew picker) and the generic POST /api/crews/paged every
   collection gets. There is nothing here for the paginated table base to save
   or delete, so this only implements page() plus the one extra read. */
@Injectable({ providedIn: 'root' })
export class CrewService implements GenericCollectionService<Crew> {
	private readonly api = inject(ApiService);

	page(request: PageRequest): Observable<Page<Crew>> {
		return this.api.post<Page<Crew>>('/api/crews/paged', request);
	}

	/* The full, unpaged crew list — GET /api/crews — for pickers like the
	   assign-crew dialog, which needs every crew at once rather than one page
	   of them. */
	list(): Observable<Crew[]> {
		return this.api.get<Crew[]>('/api/crews');
	}
}
