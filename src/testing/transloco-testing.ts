import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import es from '../../public/i18n/es.json';
import en from '../../public/i18n/en.json';

/* Real dictionaries rather than stubs, so a spec that asserts on visible copy
   fails when a key is renamed instead of quietly rendering the key name. */
export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
	return TranslocoTestingModule.forRoot({
		langs: { es, en },
		translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
		preloadLangs: true,
		...options
	});
}
