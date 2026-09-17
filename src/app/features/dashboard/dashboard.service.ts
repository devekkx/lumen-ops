import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';

export type LampType = 'SODIUM' | 'LED' | 'METAL_HALIDE';
export type FaultSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EnergyPoint {
	t: number;
	kwh: number;
}

export interface LampTypeConsumption {
	name: LampType;
	kwh: number;
}

export interface SeverityCount {
	name: FaultSeverity;
	count: number;
}

export interface DashboardKpis {
	luminaires: number;
	openFaults: number;
	ordersOpen: number;
	consumption: number;
	availability: number;
}

export interface DashboardSnapshot {
	bucketHours: number;
	series: EnergyPoint[];
	byLampType: LampTypeConsumption[];
	bySeverity: SeverityCount[];
	kpis: DashboardKpis;
}

export interface DashboardQuery {
	from: string;
	to: string;
	zoneId?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
	private readonly _api = inject(ApiService);

	public snapshot(query: DashboardQuery): Observable<DashboardSnapshot> {
		return this._api.get<DashboardSnapshot>('/api/dashboard', {
			from: query.from,
			to: query.to,
			zoneId: query.zoneId
		});
	}
}
