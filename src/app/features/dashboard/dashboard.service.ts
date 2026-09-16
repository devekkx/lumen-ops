import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';

/* Mirrors mock-api/energy.ts's response shape independently rather than
   importing it - the contract is the wire payload, not shared code, matching
   how Luminaire is redeclared in luminaire.service.ts rather than imported
   from the seed. */
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

/* One daily bucket per calendar day for ranges over 48h, hourly otherwise -
   see the aggregation note in docs/mock-api.md. Bucket boundaries are read
   off `bucketHours` rather than inferred from `series.length`, because an
   empty range still needs to know how to label an (empty) axis. */
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
	private readonly api = inject(ApiService);

	snapshot(query: DashboardQuery): Observable<DashboardSnapshot> {
		return this.api.get<DashboardSnapshot>('/api/dashboard', {
			from: query.from,
			to: query.to,
			zoneId: query.zoneId
		});
	}
}
