import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { GenericCollectionService } from '@shared/services/generic-collection.service';
import { Page, PageRequest } from '@shared/models/pagination';

/* Mirrors the seed's shape independently rather than importing it — the
   contract is the wire payload, not shared code, matching how the filter
   DSL's evaluator is deliberately reimplemented on both sides. */
export type LampType = 'SODIUM' | 'LED' | 'METAL_HALIDE';
export type LuminaireStatus = 'OK' | 'FAULT' | 'MAINTENANCE' | 'OFFLINE';

export const LAMP_TYPES: readonly LampType[] = ['SODIUM', 'LED', 'METAL_HALIDE'];
export const LUMINAIRE_STATUSES: readonly LuminaireStatus[] = [
	'OK',
	'FAULT',
	'MAINTENANCE',
	'OFFLINE'
];

export interface Luminaire {
	id: string;
	code: string;
	street: string;
	streetNumber: number;
	zoneId: string;
	zone: string;
	lat: number;
	lon: number;
	lampType: LampType;
	wattage: number;
	installedAt: string;
	status: LuminaireStatus;
	cabinet: string;
	trap?: string;
}

export const LUMINAIRE_SEARCH_KEYS = ['code', 'street', 'zone'] as const;

@Injectable({ providedIn: 'root' })
export class LuminaireService implements GenericCollectionService<Luminaire> {
	private readonly api = inject(ApiService);

	page(request: PageRequest): Observable<Page<Luminaire>> {
		return this.api.post<Page<Luminaire>>('/api/luminaires/paged', request);
	}

	get(id: string): Observable<Luminaire> {
		return this.api.get<Luminaire>(`/api/luminaires/${id}`);
	}
}
