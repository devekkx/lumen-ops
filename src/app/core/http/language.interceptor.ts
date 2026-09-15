import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LanguageService } from '@core/i18n/language.service';

/* Accept-Language comes from the one service that owns the language, never from
   localStorage directly and never from a component. */
export const languageInterceptor: HttpInterceptorFn = (request, next) =>
	next(
		request.clone({
			setHeaders: { 'Accept-Language': inject(LanguageService).current() }
		})
	);
