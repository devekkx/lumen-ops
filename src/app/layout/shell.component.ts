import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { LOCALES, LanguageService, Locale } from '@core/i18n/language.service';
import { toneFor } from '@shared/models/status-tone';
import { ToastHostComponent } from '@shared/components/toast-host/toast-host.component';
import { NAV_GROUPS } from './nav.config';
import { crumbsFrom } from './breadcrumbs';

const COLLAPSED_KEY = 'lumen.sidebar.collapsed';
const MOBILE_WIDTH = 920;

@Component({
	selector: 'lumen-shell',
	standalone: true,
	imports: [RouterOutlet, RouterLink, TranslocoDirective, ToastHostComponent],
	templateUrl: './shell.component.html',
	styleUrl: './shell.component.scss'
})
export class ShellComponent {
	private readonly router = inject(Router);
	private readonly auth = inject(AuthService);
	private readonly language = inject(LanguageService);

	readonly locales = LOCALES;
	readonly activeLocale = this.language.current;
	readonly user = this.auth.user;

	readonly collapsed = signal(this.restoreCollapsed());
	readonly menuOpen = signal(false);
	readonly narrow = signal(window.innerWidth < MOBILE_WIDTH);

	/* Below the breakpoint the aside is an overlay, so "collapsed" stops meaning
	   narrow and starts meaning hidden. One flag, two behaviours — hence the
	   separate `narrow` signal rather than a CSS-only solution: the backdrop and
	   the aria-expanded state have to agree with the layout. */
	readonly asideOpen = computed(() => (this.narrow() ? !this.collapsed() : true));
	readonly showBackdrop = computed(() => this.narrow() && this.asideOpen());
	readonly showLabels = computed(() => this.narrow() || !this.collapsed());

	private readonly navigation = toSignal(
		this.router.events.pipe(
			filter((event): event is NavigationEnd => event instanceof NavigationEnd),
			map(() => this.router.routerState.snapshot.root),
			startWith(this.router.routerState.snapshot.root)
		),
		{ initialValue: this.router.routerState.snapshot.root }
	);

	readonly crumbs = computed(() => crumbsFrom(this.navigation()));

	/* Only the groups this user can reach, and only their reachable items — an
	   empty group renders no heading rather than a heading over nothing. */
	readonly groups = computed(() => {
		const auth = this.auth;
		return NAV_GROUPS.map((group) => ({
			label: group.label,
			items: group.items.filter((item) => !item.roles || auth.hasSomeRole(item.roles))
		})).filter((group) => group.items.length > 0);
	});

	readonly session = computed(() => {
		const user = this.user();
		if (!user) return null;
		return {
			name: user.name,
			email: user.email,
			org: user.org,
			role: user.roles[0],
			tone: toneFor(user.roles[0]),
			initials: user.name
				.split(' ')
				.map((part) => part[0])
				.slice(0, 2)
				.join('')
		};
	});

	constructor() {
		window.addEventListener('resize', this.onResize, { passive: true });

		/* Closing the menu on navigation rather than leaving it open over the
		   next page. */
		effect(() => {
			this.navigation();
			this.menuOpen.set(false);
		});
	}

	private readonly onResize = () => this.narrow.set(window.innerWidth < MOBILE_WIDTH);

	toggleAside(): void {
		this.collapsed.update((value) => {
			this.persistCollapsed(!value);
			return !value;
		});
	}

	closeAside(): void {
		if (this.narrow()) this.collapsed.set(true);
	}

	toggleMenu(): void {
		this.menuOpen.update((open) => !open);
	}

	closeMenu(): void {
		this.menuOpen.set(false);
	}

	/* Escape closes the menu and returns focus to the trigger, or keyboard users
	   are dropped into the page behind it. */
	onMenuKeydown(event: KeyboardEvent, trigger: HTMLElement): void {
		if (event.key !== 'Escape') return;
		event.stopPropagation();
		this.closeMenu();
		trigger.focus();
	}

	use(locale: Locale): void {
		this.language.use(locale);
	}

	isActive(path: string): boolean {
		return this.router.isActive(path, {
			paths: 'subset',
			queryParams: 'ignored',
			fragment: 'ignored',
			matrixParams: 'ignored'
		});
	}

	logout(): void {
		this.auth.logout();
		void this.router.navigateByUrl('/auth/login');
	}

	private restoreCollapsed(): boolean {
		try {
			/* Default collapsed on a narrow screen, expanded on a wide one. */
			const stored = localStorage.getItem(COLLAPSED_KEY);
			if (stored === null) return window.innerWidth < MOBILE_WIDTH;
			return stored === 'true';
		} catch {
			return false;
		}
	}

	private persistCollapsed(value: boolean): void {
		try {
			localStorage.setItem(COLLAPSED_KEY, String(value));
		} catch {
			/* The sidebar just will not remember. Not worth failing over. */
		}
	}
}
