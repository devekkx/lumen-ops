import { Observable } from 'rxjs';
import { Page, PageRequest } from '../models/pagination';

export interface GenericCollectionService<T> {
	page(request: PageRequest): Observable<Page<T>>;
	get?(id: string): Observable<T>;
	save?(value: T): Observable<T>;
	delete?(id: string): Observable<void>;
}
