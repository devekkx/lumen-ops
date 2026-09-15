import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { getTranslocoModule } from '../testing/transloco-testing';
import { AuthService } from '@core/auth/auth.service';
import { AppComponent } from './app.component';

/* The splash is the fix for a specific bug: without it, reloading a deep route
   renders the login screen for one frame while the token is still being
   decoded, which reads as being logged out at random. */
describe('AppComponent', () => {
	const booting = signal(true);

	const render = () => {
		const fixture = TestBed.createComponent(AppComponent);
		fixture.detectChanges();
		return fixture;
	};

	beforeEach(() => {
		booting.set(true);
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [AppComponent, getTranslocoModule()],
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: { booting: booting.asReadonly() } }
			]
		});
	});

	it('shows the splash while the session is resolving', () => {
		const fixture = render();
		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector('.boot')).toBeTruthy();
		expect(element.querySelector('router-outlet')).toBeNull();
	});

	it('announces the wait to assistive technology rather than only spinning', () => {
		const status = (render().nativeElement as HTMLElement).querySelector('.boot__copy');
		expect(status?.getAttribute('role')).toBe('status');
	});

	it('hands over to the router once the session has settled', () => {
		const fixture = render();
		booting.set(false);
		fixture.detectChanges();

		const element = fixture.nativeElement as HTMLElement;
		expect(element.querySelector('.boot')).toBeNull();
		expect(element.querySelector('router-outlet')).toBeTruthy();
	});
});
