import { ApplicationRef, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MODAL_DATA, MODAL_REF, ModalRef, ModalService } from './modal.service';

interface TestData {
	label: string;
}

@Component({
	standalone: true,
	template: `<button class="confirm" type="button" (click)="ref.close(true)">
		{{ data.label }}
	</button>`
})
class TestModalComponent {
	public readonly ref = inject<ModalRef<boolean>>(MODAL_REF);
	public readonly data = inject<TestData>(MODAL_DATA);
}

describe('ModalService', () => {
	let service: ModalService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(ModalService);
	});

	afterEach(() => {
		/* Anything left attached (a dialog never closed by its own test) would
		   otherwise leak an overlay/backdrop into the next test's DOM. */
		document.querySelectorAll('.cdk-overlay-container').forEach((element) => element.remove());
	});

	it('resolves with the value the opened component closes with', async () => {
		const pending = service.open<TestModalComponent, boolean>(TestModalComponent, {
			label: 'yes'
		});

		document.querySelector<HTMLButtonElement>('.confirm')?.click();

		await expectAsync(pending).toBeResolvedTo(true);
	});

	it('passes the data payload through to the opened component', () => {
		void service.open<TestModalComponent, boolean>(TestModalComponent, { label: 'hello' });
		/* The portal-created component is outside any TestBed fixture, so
		   there is no fixture.detectChanges() to call - the DOM node exists
		   as soon as the overlay attaches, but its {{ data.label }} binding
		   is not flushed into it until the next change-detection tick. */
		TestBed.inject(ApplicationRef).tick();

		expect(document.querySelector('.confirm')?.textContent?.trim()).toBe('hello');
	});

	it('resolves undefined on a backdrop click, without the caller having to guess that', async () => {
		const pending = service.open(TestModalComponent, { label: 'x' });

		document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();

		await expectAsync(pending).toBeResolvedTo(undefined);
	});

	it('resolves undefined on Escape', async () => {
		const pending = service.open(TestModalComponent, { label: 'x' });

		const pane = document.querySelector<HTMLElement>('.cdk-overlay-pane');
		pane?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

		await expectAsync(pending).toBeResolvedTo(undefined);
	});

	it('restores focus to whatever was focused before the modal opened', async () => {
		const trigger = document.createElement('button');
		document.body.appendChild(trigger);
		trigger.focus();

		const pending = service.open(TestModalComponent, { label: 'x' });
		document.querySelector<HTMLButtonElement>('.confirm')?.click();
		await pending;

		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it('removes the overlay from the DOM once resolved', async () => {
		const pending = service.open(TestModalComponent, { label: 'x' });
		document.querySelector<HTMLButtonElement>('.confirm')?.click();
		await pending;

		expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
	});
});
