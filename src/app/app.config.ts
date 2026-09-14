import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withHashLocation, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/http/auth.interceptor';
import { languageInterceptor } from './core/http/language.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor, languageInterceptor])),
    provideAppInitializer(() => inject(AuthService).initializeUser()),
    provideRouter(routes, withHashLocation(), withComponentInputBinding(), withPreloading(PreloadAllModules))
  ]
};
