import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { AuthService } from '@core/auth/auth.service';
import { LanguageService } from '@core/i18n/language.service';
import { Role, SessionUser } from '@core/auth/auth.models';
import { ShellComponent } from './shell.component';

const COLLAPSED_KEY = 'lumen.sidebar.collapsed';

describe('ShellComponent', () => {
	const user = signal<SessionUser | null>(null);
	const locale = signal<'es' | 'en'>('es');
	let used: string[] = [];

	const as = (...roles: Role[]) =>
		user.set({
			id: 'u',
			name: 'Marta Gil Soler',
			email: 'ayto@lumen.madrid',
			org: 'Área de Obras',
			roles,
			exp: 0
		});

	const render = () => {
		const fixture = TestBed.createComponent(ShellComponent);
		fixture.detectChanges();
		return fixture;
	};

	const html = () => render().nativeElement as HTMLElement;

	beforeEach(() => {
		localStorage.removeItem(COLLAPSED_KEY);
		used = [];
		user.set(null);
		locale.set('es');

		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [ShellComponent, getTranslocoModule()],
			providers: [
				provideRouter([]),
				{
					provide: AuthService,
					useValue: {
						user: user.asReadonly(),
						hasSomeRole: (roles: readonly Role[]) =>
							!!user() && roles.some((role) => user()!.roles.includes(role)),
						logout: () => user.set(null)
					}
				},
				{
					provide: LanguageService,
					useValue: {
						current: locale.asReadonly(),
						use: (value: string) => {
							used.push(value);
							locale.set(value as 'es' | 'en');
						}
					}
				}
			]
		});
	});

	afterEach(() => localStorage.removeItem(COLLAPSED_KEY));

	describe('navigation is filtered by role', () => {
		/* A link a role cannot follow is worse than no link: it looks like the
		   app is broken rather than like the feature is not theirs. */
		it('hides the dashboard and contractor items from a VIEWER', () => {
			as('VIEWER');
			const hrefs = Array.from(html().querySelectorAll('.shell__link')).map((link) =>
				link.getAttribute('href')
			);

			expect(hrefs).toContain('/luminarias');
			expect(hrefs).toContain('/averias');
			expect(hrefs).toContain('/mapa');
			expect(hrefs).not.toContain('/panel');
			expect(hrefs).not.toContain('/ordenes-trabajo');
			expect(hrefs).not.toContain('/cuadrillas');
		});

		it('shows everything to an ADMIN', () => {
			as('ADMIN');
			const hrefs = Array.from(html().querySelectorAll('.shell__link')).map((link) =>
				link.getAttribute('href')
			);

			for (const path of [
				'/panel',
				'/averias',
				'/ordenes-trabajo',
				'/cuadrillas',
				'/luminarias',
				'/mapa'
			]) {
				expect(hrefs).toContain(path);
			}
		});

		/* A heading over an empty group is worse than no heading. */
		it('drops a group left empty by filtering', () => {
			as('VIEWER');
			const labels = Array.from(html().querySelectorAll('.shell__group-label')).map((node) =>
				node.textContent?.trim()
			);
			expect(labels.length).toBe(2);
		});
	});

	describe('the aside', () => {
		it('reports its state through aria-expanded', () => {
			as('ADMIN');
			const fixture = render();
			const toggle = (fixture.nativeElement as HTMLElement).querySelector('.shell__aside-toggle')!;

			expect(toggle.getAttribute('aria-expanded')).toBe('true');
			fixture.componentInstance.toggleAside();
			fixture.detectChanges();

			/* On a wide viewport collapsing narrows the rail rather than hiding
			   it, so it stays expanded as far as assistive tech is concerned. */
			expect(fixture.componentInstance.collapsed()).toBe(true);
			expect(fixture.componentInstance.showLabels()).toBe(false);
		});

		it('remembers collapse across a reload', () => {
			as('ADMIN');
			render().componentInstance.toggleAside();
			expect(localStorage.getItem(COLLAPSED_KEY)).toBe('true');

			TestBed.resetTestingModule();
			expect(localStorage.getItem(COLLAPSED_KEY)).toBe('true');
		});

		it('survives storage that throws', () => {
			spyOn(Storage.prototype, 'setItem').and.throwError('denied');
			as('ADMIN');
			expect(() => render().componentInstance.toggleAside()).not.toThrow();
		});
	});

	describe('the session menu', () => {
		it('stays closed until asked', () => {
			as('COUNCIL');
			expect(html().querySelector('.shell__menu')).toBeNull();
		});

		it('shows name, email, role and organisation when open', () => {
			as('COUNCIL');
			const fixture = render();
			fixture.componentInstance.toggleMenu();
			fixture.detectChanges();

			const menu = (fixture.nativeElement as HTMLElement).querySelector('.shell__menu')!;
			expect(menu.textContent).toContain('Marta Gil Soler');
			expect(menu.textContent).toContain('ayto@lumen.madrid');
			expect(menu.textContent).toContain('Área de Obras');
		});

		/* Escape has to return focus to the trigger, or a keyboard user is
		   dropped into the page behind the menu with no idea where they are. */
		it('closes on Escape and restores focus to the trigger', () => {
			as('COUNCIL');
			const fixture = render();
			fixture.componentInstance.toggleMenu();
			fixture.detectChanges();

			const element = fixture.nativeElement as HTMLElement;
			const trigger = element.querySelector<HTMLElement>('.shell__chip')!;
			element
				.querySelector('.shell__menu')!
				.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			fixture.detectChanges();

			expect(fixture.componentInstance.menuOpen()).toBe(false);
			expect(document.activeElement).toBe(trigger);
		});

		it('renders no chip at all with no session', () => {
			expect(html().querySelector('.shell__chip')).toBeNull();
		});
	});

	describe('the language switcher', () => {
		it('marks the active locale with aria-pressed', () => {
			as('ADMIN');
			const buttons = Array.from(html().querySelectorAll('.shell__lang'));
			const pressed = buttons.filter((button) => button.getAttribute('aria-pressed') === 'true');

			expect(buttons.length).toBe(2);
			expect(pressed.length).toBe(1);
			expect(pressed[0].textContent?.trim()).toBe('ES');
		});

		it('delegates the switch to the language service', () => {
			as('ADMIN');
			const fixture = render();
			fixture.componentInstance.use('en');
			expect(used).toEqual(['en']);
		});
	});

	it('offers a skip link before anything else in the DOM', () => {
		as('ADMIN');
		const first = html().querySelector('a');
		expect(first?.classList.contains('lum-skip-link')).toBe(true);
		expect(first?.getAttribute('href')).toBe('#main');
	});
});
