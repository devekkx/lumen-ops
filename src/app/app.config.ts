import {
	ApplicationConfig,
	ErrorHandler,
	inject,
	provideAppInitializer,
	provideZoneChangeDetection
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import {
	provideRouter,
	withComponentInputBinding,
	withHashLocation,
	withPreloading
} from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { GlobalErrorHandler } from './core/error-handling/global-error-handler';
import { ModalService } from './core/overlay/modal.service';
import { SelectivePreloadingStrategy } from './core/routing/selective-preload.strategy';
import { apiErrorInterceptor } from './core/api/api-error.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { languageInterceptor } from './core/http/language.interceptor';
import { DEFAULT_LOCALE, LOCALES } from './core/i18n/language.service';
import { TranslocoHttpLoader } from './core/i18n/transloco.loader';

export const appConfig: ApplicationConfig = {
	providers: [
		{ provide: ErrorHandler, useClass: GlobalErrorHandler },
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideHttpClient(
			withInterceptors([authInterceptor, languageInterceptor, apiErrorInterceptor])
		),
		provideTransloco({
			config: {
				availableLangs: [...LOCALES],
				defaultLang: DEFAULT_LOCALE,
				fallbackLang: DEFAULT_LOCALE,
				missingHandler: { useFallbackTranslation: true },
				reRenderOnLangChange: true,
				prodMode: true,
				interpolation: ['{', '}']
			},
			loader: TranslocoHttpLoader
		}),
		provideAppInitializer(() => inject(AuthService).initializeUser()),
		provideAppInitializer(() => {
			inject(ModalService);
		}),
		provideRouter(
			routes,
			withHashLocation(),
			withComponentInputBinding(),
			withPreloading(SelectivePreloadingStrategy)
		)
	]
};
