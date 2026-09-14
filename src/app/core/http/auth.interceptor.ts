import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token();
  return token && !request.url.endsWith('/auth/login') && !/^https?:\/\//.test(request.url) ? next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })) : next(request);
};
