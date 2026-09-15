/* Deterministic seed data for the Madrid street-lighting contract.
 *
 * Deterministic on purpose: a fixed PRNG seed means the 600 luminaires, their
 * statuses and their faults are identical on every boot, so a screenshot in a
 * spec or a doc still matches next week. Nothing here uses Math.random.
 */

export const SEED = 20260915;
export const NOW = new Date('2026-09-15T09:00:00Z').getTime();
export const DAY = 86_400_000;

/* mulberry32 — small, fast, and good enough that the data does not look banded. */
const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const rnd = mulberry32(SEED);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const pad = (value: number, width = 4) => String(value).padStart(width, '0');
const iso = (ms: number) => new Date(ms).toISOString();

export type LampType = 'SODIUM' | 'LED' | 'METAL_HALIDE';
export type LuminaireStatus = 'OK' | 'FAULT' | 'MAINTENANCE' | 'OFFLINE';
export type FaultStatus = 'REPORTED' | 'VALIDATED' | 'IN_PROGRESS' | 'CLOSED' | 'REJECTED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OrderStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE';

export const LAMP_TYPES: readonly LampType[] = ['SODIUM', 'LED', 'METAL_HALIDE'];
export const LUMINAIRE_STATUSES: readonly LuminaireStatus[] = [
	'OK',
	'FAULT',
	'MAINTENANCE',
	'OFFLINE'
];
export const FAULT_STATUSES: readonly FaultStatus[] = [
	'REPORTED',
	'VALIDATED',
	'IN_PROGRESS',
	'CLOSED',
	'REJECTED'
];
export const SEVERITIES: readonly Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const ORDER_STATUSES: readonly OrderStatus[] = [
	'DRAFT',
	'ASSIGNED',
	'IN_PROGRESS',
	'DONE'
];
export const OPEN_FAULT_STATUSES: readonly FaultStatus[] = [
	'REPORTED',
	'VALIDATED',
	'IN_PROGRESS'
];

export interface Zone {
	id: string;
	name: string;
	lat: number;
	lon: number;
	streets: readonly string[];
}

/* Real districts and real street names inside a real bounding box — the map in
   exercise 5.1 has to look like a city, not a scatter plot. */
export const ZONES: readonly Zone[] = [
	{ id: 'Z01', name: 'Centro', lat: 40.4155, lon: -3.7074, streets: ['Calle Mayor', 'Gran Vía', 'Calle de Toledo', 'Calle de Alcalá', 'Plaza de la Cebada'] },
	{ id: 'Z02', name: 'Salamanca', lat: 40.4283, lon: -3.6797, streets: ['Calle de Serrano', 'Calle de Goya', 'Calle de Velázquez', 'Calle de Príncipe de Vergara'] },
	{ id: 'Z03', name: 'Chamberí', lat: 40.436, lon: -3.702, streets: ['Calle de Bravo Murillo', 'Calle de Génova', 'Calle de Santa Engracia', 'Glorieta de Quevedo'] },
	{ id: 'Z04', name: 'Tetuán', lat: 40.46, lon: -3.698, streets: ['Calle de Bravo Murillo', 'Avenida de Asturias', 'Calle de Marqués de Viana'] },
	{ id: 'Z05', name: 'Retiro', lat: 40.41, lon: -3.679, streets: ['Calle de O’Donnell', 'Avenida de Menéndez Pelayo', 'Calle de Narváez'] },
	{ id: 'Z06', name: 'Arganzuela', lat: 40.395, lon: -3.698, streets: ['Paseo de las Delicias', 'Calle de Embajadores', 'Ronda de Valencia', 'Paseo de la Chopera'] },
	{ id: 'Z07', name: 'Chamartín', lat: 40.465, lon: -3.68, streets: ['Paseo de la Castellana', 'Calle de Alberto Alcocer', 'Calle de Príncipe de Vergara'] },
	{ id: 'Z08', name: 'Latina', lat: 40.402, lon: -3.745, streets: ['Paseo de Extremadura', 'Calle de Illescas', 'Avenida del Manzanares'] },
	{ id: 'Z09', name: 'Carabanchel', lat: 40.383, lon: -3.73, streets: ['Calle de General Ricardos', 'Calle de Antonio López', 'Avenida de Oporto'] },
	{ id: 'Z10', name: 'Usera', lat: 40.38, lon: -3.702, streets: ['Calle de Marcelo Usera', 'Avenida de Rafaela Ybarra', 'Calle de Amparo Usera'] },
	{ id: 'Z11', name: 'Ciudad Lineal', lat: 40.445, lon: -3.652, streets: ['Calle de Arturo Soria', 'Calle de Alcalá', 'Calle de Hermanos García Noblejas'] },
	{ id: 'Z12', name: 'Moncloa-Aravaca', lat: 40.435, lon: -3.73, streets: ['Paseo de Moret', 'Avenida de Séneca', 'Calle de Isaac Peral'] }
];

const WATTAGE_BY_TYPE: Record<LampType, readonly number[]> = {
	SODIUM: [70, 100, 150, 250],
	LED: [24, 36, 48, 72],
	METAL_HALIDE: [70, 150, 250]
};

const FAULT_TEXT: readonly string[] = [
	'Luminaria apagada durante toda la noche',
	'Parpadeo intermitente desde el jueves',
	'Columna inclinada tras el viento',
	'Tapa de registro abierta a pie de calle',
	'Luminaria encendida a mediodía',
	'Cristal roto, óptica a la vista',
	'Cableado expuesto en la base de la columna',
	'Zona a oscuras: tres puntos seguidos apagados',
	'Ruido eléctrico audible en el equipo',
	'Óptica girada, deslumbra a los portales'
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

export interface Crew {
	id: string;
	code: string;
	name: string;
	contractor: string;
	members: number;
	zoneId: string;
	zone: string;
	shift: 'DAY' | 'NIGHT';
}

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
	reportedBy: 'CITIZEN' | 'INSPECTOR';
	reportedAt: string;
	dueAt: string;
	description: string;
	photos: number;
}

export interface WorkOrder {
	id: string;
	code: string;
	faultId: string;
	faultCode: string;
	luminaireCode: string;
	severity: Severity;
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

/* Skewed rather than uniform: most luminaires are healthy, most faults are
   already closed. A table where every status is equally likely hides the bugs
   that only show up when one bucket is nearly empty. */
const buildLuminaires = (): Luminaire[] => {
	const list: Luminaire[] = [];
	for (let index = 1; index <= 600; index++) {
		const zone = ZONES[index % ZONES.length];
		const lampType: LampType = rnd() < 0.42 ? 'LED' : rnd() < 0.7 ? 'SODIUM' : 'METAL_HALIDE';
		const roll = rnd();
		const status: LuminaireStatus =
			roll < 0.72 ? 'OK' : roll < 0.86 ? 'FAULT' : roll < 0.94 ? 'MAINTENANCE' : 'OFFLINE';

		list.push({
			id: `lum-${pad(index)}`,
			code: `LUM-${pad(index)}`,
			street: pick(zone.streets),
			streetNumber: int(1, 180),
			zoneId: zone.id,
			zone: zone.name,
			lat: +(zone.lat + (rnd() - 0.5) * 0.017).toFixed(6),
			lon: +(zone.lon + (rnd() - 0.5) * 0.026).toFixed(6),
			lampType,
			wattage: pick(WATTAGE_BY_TYPE[lampType]),
			installedAt: iso(NOW - int(60, 6200) * DAY).slice(0, 10),
			status,
			cabinet: `CM-${pad(int(1, 64), 2)}`
		});
	}
	return list;
};

const buildCrews = (): Crew[] => {
	const contractors = ['Iluminia Servicios', 'ElectroMadrid UTE'];
	return Array.from({ length: 12 }, (_, index) => {
		const zone = ZONES[index];
		return {
			id: `crew-${pad(index + 1, 2)}`,
			code: `CU-${pad(index + 1, 2)}`,
			name: `Cuadrilla ${zone.name}`,
			contractor: contractors[index % 2],
			members: int(2, 5),
			zoneId: zone.id,
			zone: zone.name,
			shift: index % 3 === 0 ? 'NIGHT' : 'DAY'
		};
	});
};

/* Faults cluster on luminaires that are not OK — three in four. A fault on a
   healthy lamp is possible (a citizen reports the wrong pole) but uncommon. */
const buildFaults = (luminaires: readonly Luminaire[]): Fault[] => {
	const faulty = luminaires.filter((item) => item.status !== 'OK');
	const list: Fault[] = [];

	for (let index = 1; index <= 400; index++) {
		const luminaire = rnd() < 0.75 && faulty.length ? pick(faulty) : pick(luminaires);
		const reportedAt = NOW - int(1, 220) * DAY - int(0, 23) * 3_600_000;
		const roll = rnd();
		const status: FaultStatus =
			roll < 0.28
				? 'REPORTED'
				: roll < 0.45
					? 'VALIDATED'
					: roll < 0.6
						? 'IN_PROGRESS'
						: roll < 0.92
							? 'CLOSED'
							: 'REJECTED';
		const severityRoll = rnd();

		list.push({
			id: `fault-${pad(index)}`,
			code: `AVR-${pad(index)}`,
			luminaireId: luminaire.id,
			luminaireCode: luminaire.code,
			street: luminaire.street,
			zoneId: luminaire.zoneId,
			zone: luminaire.zone,
			severity:
				severityRoll < 0.34
					? 'LOW'
					: severityRoll < 0.68
						? 'MEDIUM'
						: severityRoll < 0.9
							? 'HIGH'
							: 'CRITICAL',
			status,
			reportedBy: rnd() < 0.62 ? 'CITIZEN' : 'INSPECTOR',
			reportedAt: iso(reportedAt),
			dueAt: iso(reportedAt + int(2, 25) * DAY),
			description: pick(FAULT_TEXT),
			photos: rnd() < 0.45 ? int(1, 3) : 0
		});
	}
	return list;
};

/* A work order exists only for a fault that got past validation, which is what
   makes "validate" a state change with a visible consequence. */
const buildWorkOrders = (faults: readonly Fault[], crews: readonly Crew[]): WorkOrder[] => {
	const eligible = faults
		.filter((fault) => ['VALIDATED', 'IN_PROGRESS', 'CLOSED'].includes(fault.status))
		.slice(0, 250);

	return eligible.map((fault, index) => {
		const crew = rnd() < 0.88 ? pick(crews) : null;
		const status: OrderStatus =
			fault.status === 'CLOSED'
				? 'DONE'
				: fault.status === 'IN_PROGRESS'
					? 'IN_PROGRESS'
					: crew
						? 'ASSIGNED'
						: 'DRAFT';
		const scheduled = Date.parse(fault.reportedAt) + int(1, 12) * DAY;
		const hours = status === 'DONE' ? +(rnd() * 6 + 1).toFixed(1) : 0;

		return {
			id: `wo-${pad(index + 1)}`,
			code: `OT-${pad(index + 1)}`,
			faultId: fault.id,
			faultCode: fault.code,
			luminaireCode: fault.luminaireCode,
			severity: fault.severity,
			crewId: crew?.id ?? null,
			crewCode: crew?.code ?? null,
			crewName: crew?.name ?? null,
			contractor: crew?.contractor ?? null,
			zoneId: fault.zoneId,
			zone: fault.zone,
			status,
			scheduledAt: iso(scheduled),
			closedAt: status === 'DONE' ? iso(scheduled + int(0, 5) * DAY) : null,
			hours,
			cost: status === 'DONE' ? Math.round(hours * 48 + int(20, 340)) : 0
		};
	});
};

export const nextCode = (prefix: string, list: readonly { code: string }[]): string => {
	const max = list.reduce(
		(acc, item) => Math.max(acc, Number.parseInt(String(item.code).split('-')[1], 10) || 0),
		0
	);
	return `${prefix}-${pad(max + 1)}`;
};

/* Build order matters: every builder draws from the same PRNG stream, so
   reordering these four calls changes all of the data. */
export const luminaires = buildLuminaires();
export const crews = buildCrews();

export const database = {
	faults: buildFaults(luminaires),
	workOrders: [] as WorkOrder[]
};
database.workOrders = buildWorkOrders(database.faults, crews);

export const resetDatabase = (): void => {
	database.faults = buildFaults(luminaires);
	database.workOrders = buildWorkOrders(database.faults, crews);
};

/* The two deliberate traps from exercise 1.2, step 6. Marked on the record
   itself so the app can show which one it is rather than hardcoding an id. */
export const TRAP_500_ID = luminaires[311].id;
luminaires[311].trap = 'ERROR_500';
