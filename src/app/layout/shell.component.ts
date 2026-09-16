import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { LOCALES, LanguageService, Locale } from '@core/i18n/language.service';
import { toneFor } from '@shared/models/status-tone';
import { ToastHostComponent } from '@shared/components/toast-host/toast-host.component';
import { LumenTooltipDirective } from '@shared/directives/tooltip.directive';
import { NAV_GROUPS } from './nav.config';
import { crumbsFrom } from './breadcrumbs';

const COLLAPSED_KEY = 'lumen.sidebar.collapsed';
const MOBILE_WIDTH = 920;
/* Keep in sync with $aside-width / $aside-width-collapsed in
   shell.component.scss — the toggle's floating position is computed off
   these same widths so it always sits straddling the aside's current edge. */
const ASIDE_WIDTH = 248;
const ASIDE_WIDTH_COLLAPSED = 72;
const TOGGLE_RADIUS = 17; // half of the 34px disc, so it straddles the edge

@Component({
	selector: 'lumen-shell',
	standalone: true,
	imports: [RouterOutlet, RouterLink, TranslocoDirective, ToastHostComponent, LumenTooltipDirective],
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

	@ViewChild('menuFirstFocusable') private menuFirstFocusable?: ElementRef<HTMLElement>;

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

	/* The toggle is a floating disc that straddles the aside's current right
	   edge (half over the aside, half over the content) rather than a fixed
	   corner button — it has to move as the aside's own width changes. On a
	   narrow screen the drawer is an overlay, not a layout column — nothing
	   sits at a "current edge" to straddle in either state — so the button
	   stays in one fixed spot (the flush left-edge tab) whether the drawer
	   is open or closed, instead of jumping between two positions. */
	readonly toggleLeft = computed(() => {
		if (this.narrow()) return 0;
		return (this.collapsed() ? ASIDE_WIDTH_COLLAPSED : ASIDE_WIDTH) - TOGGLE_RADIUS;
	});

	readonly toggleTop = computed(() =>
		this.narrow() ? Math.max(120, Math.round(window.innerHeight / 2) - 23) : 90
	);

	readonly toggleFlushTab = computed(() => this.narrow());

	/* The scrim behind the user menu sits above the aside in stacking order
	   (z-index 39 vs. 30), so inset: 0 would blur/dim the sidebar along with
	   the content it's actually meant to dim — harmless while it was fully
	   invisible, visible now that it carries a blur. On a normal-width
	   screen the aside is a permanent column, not an overlay, so the scrim
	   should only ever cover what's actually behind the menu: the content
	   area to its right. On a narrow screen the aside is already its own
	   overlay above everything else, so there is nothing wrong with the
	   scrim covering the full width there too. */
	readonly menuScrimLeft = computed(() => {
		if (this.narrow()) return 0;
		return this.collapsed() ? ASIDE_WIDTH_COLLAPSED : ASIDE_WIDTH;
	});

	/* Points toward what the click does: left/"collapse" while open, right/
	   "expand" while closed — never the hamburger glyph the design has no use
	   for on a control that always has an open-or-closed aside to describe. */
	/* collapsed(), not asideOpen() — asideOpen() is hardcoded true on desktop
	   (it only tracks the narrow-screen drawer's open/closed state), so the
	   icon never changed on a normal-width screen even though the button's
	   position correctly did. collapsed() is what actually varies in both
	   modes and is what the icon needs to track. */
	readonly toggleIconPath = computed(() =>
		!this.collapsed() ? 'M14.5 6.5 9 12l5.5 5.5' : 'M9.5 6.5 15 12l-5.5 5.5'
	);

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

	/* Opening the menu with the keyboard (Enter/Space on the trigger) should
	   land focus inside it — otherwise a keyboard user hears "menu opened" and
	   is left exactly where they were, with no obvious way to reach it. */
	toggleMenu(): void {
		const next = !this.menuOpen();
		this.menuOpen.set(next);
		if (next) {
			setTimeout(() => this.menuFirstFocusable?.nativeElement.focus());
		}
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
