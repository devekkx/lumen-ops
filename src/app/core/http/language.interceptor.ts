import { HttpInterceptorFn } from '@angular/common/http';
export const languageInterceptor: HttpInterceptorFn = (request, next) => next(request.clone({ setHeaders: { 'Accept-Language': localStorage.getItem('lumen.language') ?? 'es' } }));
