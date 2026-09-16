import {
	ApplicationConfig,
	inject,
	provideAppInitializer,
	provideZoneChangeDetection
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import {
	PreloadAllModules,
	provideRouter,
	withComponentInputBinding,
	withHashLocation,
	withPreloading
} from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { ModalService } from './core/overlay/modal.service';
import { apiErrorInterceptor } from './core/api/api-error.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { languageInterceptor } from './core/http/language.interceptor';
import { DEFAULT_LOCALE, LOCALES } from './core/i18n/language.service';
import { TranslocoHttpLoader } from './core/i18n/transloco.loader';

export const appConfig: ApplicationConfig = {
	providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideHttpClient(
			withInterceptors([authInterceptor, languageInterceptor, apiErrorInterceptor])
		),
		provideTransloco({
			config: {
				availableLangs: [...LOCALES],
				defaultLang: DEFAULT_LOCALE,
				fallbackLang: DEFAULT_LOCALE,
				/* Spanish is both default and fallback: a key missing from en.json
           shows Spanish copy rather than a raw key in the UI. */
				missingHandler: { useFallbackTranslation: true },
				reRenderOnLangChange: true,
				prodMode: true,
				/* Every string in en.json/es.json is written with single-brace
				   params — 'Showing {a}–{b} of {total}', 'Fault {code} saved' —
				   but Transloco's own default is double braces ('{{a}}'). Left at
				   the default, every parameterised translation in the app renders
				   its placeholders literally instead of substituting them; this
				   is what actually matches the dictionaries. */
				interpolation: ['{', '}']
			},
			loader: TranslocoHttpLoader
		}),
		provideAppInitializer(() => inject(AuthService).initializeUser()),
		/* Forces ModalService's constructor to run at bootstrap, before any
		   route or @Confirmable-decorated method can call ModalService.instance.
		   Without this, the static instance is only set the first time some
		   component happens to inject it — which a CONTRACTOR-only session that
		   never opens the fault form might never do, so ModalService.instance
		   would throw the first time @Confirmable ran, silently no-opping a
		   destructive action's confirm step instead of running it. */
		provideAppInitializer(() => {
			inject(ModalService);
		}),
		provideRouter(
			routes,
			withHashLocation(),
			withComponentInputBinding(),
			withPreloading(PreloadAllModules)
		)
	]
};
