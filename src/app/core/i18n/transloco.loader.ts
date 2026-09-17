import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
	private readonly _http = inject(HttpClient);

	getTranslation(path: string) {
		return this._http.get<Translation>(`/i18n/${path}.json`);
	}
}
