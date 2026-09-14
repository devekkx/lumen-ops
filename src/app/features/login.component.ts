import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
	standalone: true,
	imports: [RouterLink],
	template: `<main class="login">
		<section class="card shadow-sm">
			<div class="card-body">
				<h1>Lumen Ops</h1>
				<p>Authentication scaffold. The mock API exposes four training roles.</p>
				<a class="btn btn-lumen" routerLink="/luminarias">Continue to app</a>
			</div>
		</section>
	</main>`,
	styles: [
		'.login { min-height: 100vh; display:grid; place-items:center; } .card { width:min(26rem, 90vw); }'
	]
})
export class LoginComponent {}
