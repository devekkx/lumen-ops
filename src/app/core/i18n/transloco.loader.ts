import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

/* Loads a root bundle from /i18n/<lang>.json and a scoped one from
   /i18n/<scope>/<lang>.json. Transloco passes a scoped path as 'map/es', so the
   same loader serves both and no scope needs registering here. */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
	private readonly http = inject(HttpClient);

	getTranslation(path: string) {
		return this.http.get<Translation>(`/i18n/${path}.json`);
	}
}
