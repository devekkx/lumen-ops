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
				prodMode: true
			},
			loader: TranslocoHttpLoader
		}),
		provideAppInitializer(() => inject(AuthService).initializeUser()),
		provideRouter(
			routes,
			withHashLocation(),
			withComponentInputBinding(),
			withPreloading(PreloadAllModules)
		)
	]
};
