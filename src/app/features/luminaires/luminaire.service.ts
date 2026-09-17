import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { GenericCollectionService } from '@shared/services/generic-collection.service';
import { Filters } from '@shared/models/filter';
import { Page, PageRequest } from '@shared/models/pagination';

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

export interface GeoRequest {
	searchTerm?: string;
	searchKeys?: string[];
	filters?: Filters;
}

@Injectable({ providedIn: 'root' })
export class LuminaireService implements GenericCollectionService<Luminaire> {
	private readonly _api = inject(ApiService);

	page(request: PageRequest): Observable<Page<Luminaire>> {
		return this._api.post<Page<Luminaire>>('/api/luminaires/paged', request);
	}

	get(id: string): Observable<Luminaire> {
		return this._api.get<Luminaire>(`/api/luminaires/${id}`);
	}

	/* /api/luminaires/geo returns a plain array, not a Page - the map draws
	   every matching feature at once rather than one page of them. */
	geo(request: GeoRequest = {}): Observable<Luminaire[]> {
		return this._api.post<Luminaire[]>('/api/luminaires/geo', request);
	}
}
