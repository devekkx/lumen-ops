/* Hourly consumption with a visible daily cycle, and the dashboard aggregation
 * over it.
 *
 * Exercise 1.2 asks for "something with a visible daily cycle rather than
 * noise", because a chart of noise teaches nothing on day 5. So the model is
 * physical: lamps burn between dusk and dawn, the night is longer in winter,
 * and LED fittings dim after 01:00.
 */

import {
	DAY,
	LAMP_TYPES,
	NOW,
	OPEN_FAULT_STATUSES,
	SEVERITIES,
	type LampType,
	type Luminaire,
	database,
	luminaires
} from './seed';

const HOUR = 3_600_000;

/* Deterministic per-hour jitter — the same hour always gets the same wobble, so
   two requests for the same range return the same series. */
const hash = (value: number) => {
	const x = Math.sin(value) * 10000;
	return x - Math.floor(x);
};

/* What fraction of a given hour the lamp is lit. Dusk and dawn shift with the
   season, and the boundary hours are partial rather than all-or-nothing. */
const nightFraction = (date: Date, hour: number): number => {
	const month = date.getUTCMonth();
	const winter = Math.cos((month / 12) * 2 * Math.PI) * 0.5 + 0.5;
	const dusk = 19.2 - winter * 2.2;
	const dawn = 6.2 + winter * 1.6;

	if (hour >= Math.floor(dusk) && hour < 24) {
		return hour === Math.floor(dusk) ? 1 - (dusk % 1) : 1;
	}
	if (hour < Math.floor(dawn)) return 1;
	if (hour === Math.floor(dawn)) return dawn % 1;
	return 0;
};

const dimFactor = (lampType: LampType, hour: number) =>
	lampType === 'LED' && hour >= 1 && hour < 5 ? 0.55 : 1;

export interface Reading {
	t: number;
	kwh: number;
}

export const energyFor = (luminaire: Luminaire, fromMs: number, toMs: number): Reading[] => {
	const rows: Reading[] = [];
	const start = Math.floor(fromMs / HOUR) * HOUR;

	for (let t = start; t <= toMs; t += HOUR) {
		const date = new Date(t);
		const hour = date.getUTCHours();
		const on = nightFraction(date, hour) * dimFactor(luminaire.lampType, hour);
		const noise = 0.94 + hash(t / HOUR + luminaire.wattage) * 0.12;
		const kwh = luminaire.status === 'OFFLINE' ? 0 : (luminaire.wattage / 1000) * on * noise;
		rows.push({ t, kwh: +kwh.toFixed(4) });
	}
	return rows;
};

export interface DashboardQuery {
	from?: string;
	to?: string;
	zoneId?: string;
}

/* Aggregated per lamp-type cohort rather than per asset: 600 luminaires across
   90 days is 1.3M hourly readings, and nobody needs them individually to draw
   a line. Summing the cohort's wattage once keeps this instant. */
export const dashboard = ({ from, to, zoneId }: DashboardQuery = {}) => {
	const toMs = Date.parse(to ?? '') || NOW;
	const fromMs = Date.parse(from ?? '') || toMs - 7 * DAY;

	const scope = luminaires.filter((item) => (zoneId ? item.zoneId === zoneId : true));
	const cohorts = LAMP_TYPES.map((type) => {
		const group = scope.filter((item) => item.lampType === type && item.status !== 'OFFLINE');
		return {
			type,
			count: group.length,
			watts: group.reduce((sum, item) => sum + item.wattage, 0)
		};
	});

	const spanHours = Math.max(1, Math.round((toMs - fromMs) / HOUR));
	const bucketHours = spanHours <= 48 ? 1 : 24;

	const buckets: number[] = [];
	for (let t = fromMs; t <= toMs; t += bucketHours * HOUR) buckets.push(t);

	const byLampType = LAMP_TYPES.map((name) => ({ name, kwh: 0 }));
	const series = buckets.map((bucketStart) => {
		let total = 0;
		for (let offset = 0; offset < bucketHours; offset++) {
			const t = bucketStart + offset * HOUR;
			if (t > toMs) break;
			const date = new Date(t);
			const hour = date.getUTCHours();
			const fraction = nightFraction(date, hour);

			cohorts.forEach((cohort, index) => {
				const kwh = (cohort.watts / 1000) * fraction * dimFactor(cohort.type, hour);
				total += kwh;
				byLampType[index].kwh += kwh;
			});
		}
		return { t: bucketStart, kwh: +total.toFixed(2) };
	});

	const inRange = database.faults.filter((fault) => {
		const at = Date.parse(fault.reportedAt);
		return at >= fromMs && at <= toMs && (zoneId ? fault.zoneId === zoneId : true);
	});

	return {
		bucketHours,
		series,
		byLampType: byLampType.map((bucket) => ({ ...bucket, kwh: +bucket.kwh.toFixed(1) })),
		bySeverity: SEVERITIES.map((name) => ({
			name,
			count: inRange.filter((fault) => fault.severity === name).length
		})),
		kpis: {
			luminaires: scope.length,
			openFaults: database.faults.filter((fault) => OPEN_FAULT_STATUSES.includes(fault.status))
				.length,
			ordersOpen: database.workOrders.filter((order) => order.status !== 'DONE').length,
			consumption: +series.reduce((sum, point) => sum + point.kwh, 0).toFixed(0),
			availability: +(
				(scope.filter((item) => item.status === 'OK').length / Math.max(1, scope.length)) *
				100
			).toFixed(1)
		}
	};
};
