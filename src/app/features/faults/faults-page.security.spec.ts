import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { AuthService } from '@core/auth/auth.service';
import { Abilities } from '@core/auth/auth.models';
import { Page } from '@shared/models/pagination';
import { Fault, FaultService } from './fault.service';
import { FaultsPageComponent } from './faults-page.component';

/* The brief calls this the single most valuable test in the exercise: a
 * VIEWER's rendered DOM must contain *zero* write-action elements, not merely
 * disabled ones — a disabled button still ships its handler and its intent
 * to any user poking at devtools, and a CSS-hidden one still exists in the
 * accessibility tree. Asserting on [data-action] rather than button text or
 * count also means the assertion can never pass by accident (an unrelated
 * button that happens to share a label would not carry the attribute).
 */
const abilitiesOf = (overrides: Partial<Abilities>): Abilities => ({
	viewLuminaires: true,
	viewFaults: true,
	createFault: false,
	editFault: false,
	validateFault: false,
	rejectFault: false,
	closeFault: false,
	deleteFault: false,
	assignCrew: false,
	startOrder: false,
	completeOrder: false,
	editCrew: false,
	exportData: false,
	seeDiagnostics: false,
	seeCosts: false,
	...overrides
});

const samplePage: Page<Fault> = {
	data: [
		{
			id: 'fault-1',
			code: 'AVR-0001',
			luminaireId: 'lum-1',
			luminaireCode: 'LUM-0001',
			street: 'Calle Mayor',
			zoneId: 'z1',
			zone: 'Centro',
			severity: 'HIGH',
			status: 'REPORTED',
			reportedBy: 'CITIZEN',
			reportedAt: '2024-01-01T00:00:00.000Z',
			dueAt: '2024-01-08T00:00:00.000Z',
			description: 'A broken lamp reported near the plaza',
			photos: 0
		}
	],
	currentPage: 1,
	lastPage: 1,
	total: 1,
	perPage: 20
};

/* Renders the page against a stubbed AuthService/FaultService and lets the
   base class's 250ms debounce elapse so the (stubbed) page actually loads —
   asserting against an empty, still-loading table would prove nothing.
   The v2 (resource()) base needs one more beat than v1 did here: `tick(250)`
   plus a `detectChanges()` flushes the debounce and starts resource()'s
   loadEffect, but that effect is `async` — even a synchronous `of(samplePage)`
   resolves through a microtask, which only a *subsequent* `tick()` drains
   (nothing after this point re-enters the fake clock to drain it otherwise).
   The final `detectChanges()` then re-renders against the now-resolved page. */
const render = (abilities: Abilities) => {
	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		imports: [FaultsPageComponent, getTranslocoModule()],
		providers: [
			provideRouter([]),
			{ provide: AuthService, useValue: { abilities: () => abilities } },
			{ provide: FaultService, useValue: { page: () => of(samplePage) } }
		]
	});

	const fixture = TestBed.createComponent(FaultsPageComponent);
	fixture.detectChanges();
	tick(250);
	fixture.detectChanges();
	tick();
	fixture.detectChanges();
	return fixture;
};

describe('FaultsPageComponent — write actions are gated by ability, not by disabled state', () => {
	it('renders zero [data-action] elements for a VIEWER', fakeAsync(() => {
		const fixture = render(abilitiesOf({}));

		const actions = fixture.nativeElement.querySelectorAll('[data-action]');
		expect(actions.length).toBe(0);

		/* Belt and braces: not just absent, but genuinely not present anywhere
		   in the row, disabled or otherwise. */
		const buttons = fixture.nativeElement.querySelectorAll('button, a[href], a[routerLink]');
		for (const button of Array.from(buttons) as HTMLElement[]) {
			expect(button.getAttribute('data-action')).toBeNull();
		}
	}));

	it('does render the gated actions once the abilities allow them', fakeAsync(() => {
		/* Proves the VIEWER result above is because of the ability check, not
		   because the template never renders these elements at all. */
		const fixture = render(
			abilitiesOf({ createFault: true, editFault: true, validateFault: true, deleteFault: true })
		);

		const dataAction = (name: string) =>
			fixture.nativeElement.querySelector(`[data-action="${name}"]`);

		expect(dataAction('create')).not.toBeNull();
		expect(dataAction('edit')).not.toBeNull();
		/* The sample row's status is REPORTED, which is the one status
		   validateFault is gated to allow. */
		expect(dataAction('validate')).not.toBeNull();
		expect(dataAction('delete')).not.toBeNull();
	}));
});
