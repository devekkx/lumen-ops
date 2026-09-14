import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  readonly collapsed = signal(localStorage.getItem('lumen.sidebar.collapsed') === 'true');
  toggle(): void { this.collapsed.update((value) => { localStorage.setItem('lumen.sidebar.collapsed', String(!value)); return !value; }); }
}
