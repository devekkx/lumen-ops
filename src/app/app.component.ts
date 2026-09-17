import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, TranslocoDirective],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent {
	public readonly auth = inject(AuthService);
}
