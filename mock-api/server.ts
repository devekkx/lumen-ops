/* The mock backend.
 *
 * Not throwaway scaffolding: the pagination envelope and the filter payload are
 * the contract every later exercise consumes, copied from the real backend's
 * shape including the parts that look odd (one-based pages, `ordination`
 * rather than `sort`, a `filters` array of structured conditions).
 */

import express, { type Request, type Response } from 'express';
import { evaluateFilters, matchesSearch, type Filters } from './filters';
import { USERS, findUser, publicUser, signToken } from './auth';
import { dashboard, energyFor } from './energy';
import {
	DAY,
	NOW,
	OPEN_FAULT_STATUSES,
	TRAP_500_ID,
	crews,
	database,
	luminaires,
	nextCode,
	resetDatabase,
	type Crew,
	type Fault,
	type FaultStatus,
	type WorkOrder
} from './seed';

const PORT = Number(process.env.PORT ?? 3000);

/* Artificial latency, from exercise 1.2 step 5. Without it, debouncing and
   race conditions are invisible on localhost and two later exercises become
   meaningless - so the paged endpoints are deliberately slow and jittery. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pagedLatency = () => 300 + Math.random() * 600;
const quickLatency = () => 120 + Math.random() * 230;

interface PagedRequest {
	page?: number;
	perPage?: number;
	searchTerm?: string;
	searchKeys?: string[];
	ordination?: { property: string; direction?: 'ASC' | 'DESC' };
	filters?: Filters;
}

const collections = () => ({
	luminaires,
	faults: database.faults,
	'work-orders': database.workOrders,
	crews
});

type CollectionName = keyof ReturnType<typeof collections>;

/* Spanish collation on purpose: sorting 'Ñ' and accented street names with the
   default comparator puts them after 'Z', which looks like a bug to anyone
   reading a Madrid street list. */
const compare = (a: unknown, b: unknown): number => {
	if (a === b) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	return String(a).localeCompare(String(b), 'es');
};

const paginate = <T extends object>(rows: readonly T[], request: PagedRequest) => {
	const perPage = Math.min(200, Math.max(1, Number(request.perPage ?? 20)));
	const { searchTerm, searchKeys, ordination, filters } = request;

	let matched = rows.filter(
		(row) => matchesSearch(row, searchTerm, searchKeys) && evaluateFilters(row, filters)
	);

	if (ordination?.property) {
		const direction = ordination.direction === 'DESC' ? -1 : 1;
		const property = ordination.property as keyof T;
		matched = matched.slice().sort((a, b) => compare(a[property], b[property]) * direction);
	}

	const total = matched.length;
	const lastPage = Math.max(1, Math.ceil(total / perPage));
	/* Clamping rather than returning an empty page: asking for page 40 of 12
	   is a stale request, and an empty table is a worse answer than the end. */
	const currentPage = Math.min(Math.max(1, Number(request.page ?? 1)), lastPage);
	const start = (currentPage - 1) * perPage;

	return { data: matched.slice(start, start + perPage), currentPage, lastPage, total, perPage };
};

const app = express();
app.use(express.json({ limit: '4mb' }));

/* ---- auth ------------------------------------------------------------- */

app.post('/api/auth/login', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	const { email, password, expiredToken = false } = request.body ?? {};
	const user = findUser(email);

	if (!user || user.password !== password) {
		return response.status(401).json({ code: 'INVALID_CREDENTIALS' });
	}
	return response.json({
		token: signToken(user, expiredToken ? -1 : 60),
		user: publicUser(user)
	});
});

/* The login screen lists the seeded users, so nobody has to read the source to
   find a password. */
app.get('/api/auth/users', (_request: Request, response: Response) =>
	response.json(USERS.map(publicUser))
);

/* ---- collections ------------------------------------------------------ */

app.post('/api/:collection/paged', async (request: Request, response: Response) => {
	const name = request.params.collection as CollectionName;
	/* The four collections have nothing in common but being objects, and
	   paginate only ever reads properties by name, so the union collapses to
	   object[] here rather than being narrowed per collection. */
	const rows = collections()[name] as readonly object[] | undefined;
	if (!rows) return response.status(404).json({ code: 'UNKNOWN_COLLECTION' });

	await sleep(pagedLatency());
	return response.json(paginate(rows, request.body ?? {}));
});

app.get('/api/luminaires/search', async (request: Request, response: Response) => {
	await sleep(220 + Math.random() * 260);
	const needle = String(request.query.q ?? '')
		.trim()
		.toLowerCase();
	if (!needle) return response.json([]);

	const limit = Math.min(20, Math.max(1, Number(request.query.limit ?? 8)));
	return response.json(
		luminaires
			.filter(
				(item) =>
					item.code.toLowerCase().includes(needle) ||
					item.street.toLowerCase().includes(needle) ||
					item.zone.toLowerCase().includes(needle)
			)
			.slice(0, limit)
	);
});

/* The map needs every matching feature, not a page of them - the filter still
   applies, so filtering the table visibly filters the map. */
app.post('/api/luminaires/geo', async (request: Request, response: Response) => {
	await sleep(pagedLatency());
	const { searchTerm, searchKeys = ['code', 'street', 'zone'], filters } = request.body ?? {};
	return response.json(
		luminaires.filter(
			(item) => matchesSearch(item, searchTerm, searchKeys) && evaluateFilters(item, filters)
		)
	);
});

app.get('/api/luminaires/:id', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	const { id } = request.params;

	/* Trap one: this id always fails, so the error interceptor and the retry
	   policy in exercise 3.1 have something real to be tested against. */
	if (id === TRAP_500_ID) {
		return response.status(500).json({ code: 'TRAP_ALWAYS_500' });
	}

	const found = luminaires.find((item) => item.id === id || item.code === id);
	return found ? response.json(found) : response.status(404).json({ code: 'NOT_FOUND' });
});

app.get('/api/luminaires/:id/energy', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	const luminaire = luminaires.find(
		(item) => item.id === request.params.id || item.code === request.params.id
	);
	if (!luminaire) return response.status(404).json({ code: 'NOT_FOUND' });

	const from = Date.parse(String(request.query.from ?? '')) || NOW - 7 * DAY;
	const to = Date.parse(String(request.query.to ?? '')) || NOW;
	return response.json({
		luminaireId: luminaire.id,
		unit: 'kWh',
		readings: energyFor(luminaire, from, to)
	});
});

app.get('/api/luminaires/:id/faults', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	return response.json(
		database.faults.filter(
			(fault) =>
				fault.luminaireId === request.params.id && OPEN_FAULT_STATUSES.includes(fault.status)
		)
	);
});

app.get('/api/crews', async (_request: Request, response: Response) => {
	await sleep(quickLatency());
	return response.json(crews);
});

/* Editable in place, not create/delete - the twelve seeded crews are the
   contractors' real roster for this contract, not a collection an ADMIN
   session grows or shrinks; only name/contractor/members/shift are ever
   worth an ADMIN correcting. */
app.patch('/api/crews/:id', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	const crew = crews.find((item) => item.id === request.params.id);
	if (!crew) return response.status(404).json({ code: 'NOT_FOUND' });

	const patch = request.body as Partial<Crew>;
	if (patch.name !== undefined) crew.name = patch.name;
	if (patch.contractor !== undefined) crew.contractor = patch.contractor;
	if (patch.members !== undefined) crew.members = patch.members;
	if (patch.shift !== undefined) crew.shift = patch.shift;

	/* Work orders denormalise crewName/contractor at assignment time (see the
	   PATCH /api/work-orders/:id handler below) so the table never joins
	   against the crew list per row - an edit here has to walk forward and
	   refresh every order that already carries this crew's stale copy. */
	database.workOrders
		.filter((order) => order.crewId === crew.id)
		.forEach((order) => {
			order.crewName = crew.name;
			order.contractor = crew.contractor;
		});

	return response.json(crew);
});

/* ---- faults ----------------------------------------------------------- */

app.post('/api/faults', async (request: Request, response: Response) => {
	await sleep(quickLatency() + 180);
	const model = request.body ?? {};
	const luminaire = luminaires.find((item) => item.id === model.luminaireId);
	if (!luminaire) return response.status(422).json({ code: 'UNKNOWN_LUMINAIRE' });

	const created: Fault = {
		...model,
		id: `fault-${Date.now().toString(36)}`,
		code: nextCode('AVR', database.faults),
		luminaireCode: luminaire.code,
		street: luminaire.street,
		zone: luminaire.zone,
		zoneId: luminaire.zoneId,
		status: model.status ?? 'REPORTED',
		photos: model.photos ?? 0
	};
	database.faults = [created, ...database.faults];
	return response.status(201).json(created);
});

app.put('/api/faults/:id', async (request: Request, response: Response) => {
	await sleep(quickLatency() + 180);
	const index = database.faults.findIndex((fault) => fault.id === request.params.id);
	if (index < 0) return response.status(404).json({ code: 'NOT_FOUND' });

	const model = request.body ?? {};
	const luminaire = luminaires.find((item) => item.id === model.luminaireId);
	if (model.luminaireId && !luminaire) {
		return response.status(422).json({ code: 'UNKNOWN_LUMINAIRE' });
	}

	database.faults[index] = {
		...database.faults[index],
		...model,
		id: database.faults[index].id,
		...(luminaire
			? {
					luminaireCode: luminaire.code,
					street: luminaire.street,
					zone: luminaire.zone,
					zoneId: luminaire.zoneId
				}
			: {})
	};
	return response.json(database.faults[index]);
});

/* Validating a fault is what creates its work order - the state change has a
   consequence elsewhere, which is the point of modelling the lifecycle. */
app.post('/api/faults/:id/transition', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	const fault = database.faults.find((item) => item.id === request.params.id);
	if (!fault) return response.status(404).json({ code: 'NOT_FOUND' });

	const next = request.body?.status as FaultStatus;
	fault.status = next;

	if (next === 'VALIDATED' && !database.workOrders.some((order) => order.faultId === fault.id)) {
		const order: WorkOrder = {
			id: `wo-${Date.now().toString(36)}`,
			code: nextCode('OT', database.workOrders),
			faultId: fault.id,
			faultCode: fault.code,
			luminaireCode: fault.luminaireCode,
			severity: fault.severity,
			crewId: null,
			crewCode: null,
			crewName: null,
			contractor: null,
			zoneId: fault.zoneId,
			zone: fault.zone,
			status: 'DRAFT',
			scheduledAt: new Date(Date.now() + 2 * DAY).toISOString(),
			closedAt: null,
			hours: 0,
			cost: 0
		};
		database.workOrders = [order, ...database.workOrders];
	}

	if (next === 'CLOSED') {
		database.workOrders
			.filter((order) => order.faultId === fault.id)
			.forEach((order) => {
				order.status = 'DONE';
				order.closedAt = new Date().toISOString();
				order.hours ||= 2;
				order.cost ||= 196;
			});
	}

	return response.json(fault);
});

app.delete('/api/faults/:id', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	const removed = database.faults.find((fault) => fault.id === request.params.id);
	if (!removed) return response.status(404).json({ code: 'NOT_FOUND' });

	database.faults = database.faults.filter((fault) => fault.id !== request.params.id);
	database.workOrders = database.workOrders.filter((order) => order.faultId !== removed.id);
	return response.status(204).send();
});

/* ---- work orders ------------------------------------------------------ */

app.patch('/api/work-orders/:id', async (request: Request, response: Response) => {
	await sleep(quickLatency());
	const order = database.workOrders.find((item) => item.id === request.params.id);
	if (!order) return response.status(404).json({ code: 'NOT_FOUND' });

	const patch = request.body ?? {};

	if (patch.crewId) {
		const crew = crews.find((item) => item.id === patch.crewId);
		if (!crew) return response.status(422).json({ code: 'UNKNOWN_CREW' });
		Object.assign(order, {
			crewId: crew.id,
			crewCode: crew.code,
			crewName: crew.name,
			contractor: crew.contractor
		});
		if (order.status === 'DRAFT') order.status = 'ASSIGNED';
	}

	if (patch.status) order.status = patch.status;
	if (patch.scheduledAt) order.scheduledAt = patch.scheduledAt;

	/* The order and its fault stay in step in both directions. */
	const fault = database.faults.find((item) => item.id === order.faultId);
	if (patch.status === 'DONE') {
		order.closedAt = new Date().toISOString();
		order.hours ||= 2.5;
		order.cost ||= 244;
		if (fault) fault.status = 'CLOSED';
	}
	if (patch.status === 'IN_PROGRESS' && fault) fault.status = 'IN_PROGRESS';

	return response.json(order);
});

/* ---- dashboard -------------------------------------------------------- */

app.get('/api/dashboard', async (request: Request, response: Response) => {
	await sleep(pagedLatency());
	return response.json(
		dashboard({
			from: request.query.from as string,
			to: request.query.to as string,
			zoneId: request.query.zoneId as string
		})
	);
});

/* ---- diagnostics ------------------------------------------------------ */

/* Trap two: four seconds, so a timeout and a cancelled request are observable
   without throttling the browser. */
app.get('/api/diagnostics/slow', async (_request: Request, response: Response) => {
	await sleep(4000);
	return response.json({ ok: true, tookMs: 4000 });
});

app.get('/api/diagnostics/traps', (_request: Request, response: Response) =>
	response.json({ always500LuminaireId: TRAP_500_ID, slowPath: '/api/diagnostics/slow' })
);

app.post('/api/diagnostics/reset', (_request: Request, response: Response) => {
	resetDatabase();
	return response.json({ ok: true, ...counts() });
});

const counts = () => ({
	luminaires: luminaires.length,
	faults: database.faults.length,
	workOrders: database.workOrders.length,
	crews: crews.length
});

app.listen(PORT, () => {
	const { luminaires: l, faults: f, workOrders: w, crews: c } = counts();
	console.log(`Mock API on http://localhost:${PORT}`);
	console.log(`  seeded: ${l} luminaires · ${f} faults · ${w} work orders · ${c} crews`);
	console.log(`  traps:  always-500 luminaire ${TRAP_500_ID} · 4s GET /api/diagnostics/slow`);
});
