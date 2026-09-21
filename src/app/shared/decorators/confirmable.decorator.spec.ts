import { TestBed } from '@angular/core/testing';
import { ModalService } from '@core/overlay/modal.service';
import { Confirmable } from './confirmable.decorator';

class Widget {
	public ran = false;
	public lastArgs: unknown[] = [];

	@Confirmable('confirm.deleteFault', { params: (id: string) => ({ id }) })
	public delete(id: string): void {
		this.ran = true;
		this.lastArgs = [id];
	}
}

describe('Confirmable', () => {
	let openSpy: jasmine.Spy;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		/* TestBed.inject constructs the real ModalService through Angular's DI,
		   which is exactly what provideAppInitializer does at real app
		   bootstrap - it is what sets ModalService's static instance the
		   decorator reaches through. */
		const modal = TestBed.inject(ModalService);
		openSpy = spyOn(modal, 'open');
	});

	it('runs the original method once the user confirms', async () => {
		openSpy.and.resolveTo(true);
		const widget = new Widget();

		widget.delete('fault-1');
		await Promise.resolve();
		await Promise.resolve();

		expect(widget.ran).toBe(true);
		expect(widget.lastArgs).toEqual(['fault-1']);
		expect(openSpy).toHaveBeenCalledTimes(1);
	});

	it('never runs the original method when the user declines', async () => {
		openSpy.and.resolveTo(false);
		const widget = new Widget();

		widget.delete('fault-1');
		await Promise.resolve();
		await Promise.resolve();

		expect(widget.ran).toBe(false);
	});

	it('never runs the original method when the dialog resolves undefined (backdrop/Escape)', async () => {
		openSpy.and.resolveTo(undefined);
		const widget = new Widget();

		widget.delete('fault-1');
		await Promise.resolve();
		await Promise.resolve();

		expect(widget.ran).toBe(false);
	});

	it('passes the call-site params through to the confirm dialog data', async () => {
		openSpy.and.resolveTo(true);
		new Widget().delete('fault-42');
		await Promise.resolve();

		const data = openSpy.calls.mostRecent().args[1] as { params: unknown };
		expect(data.params).toEqual({ id: 'fault-42' });
	});

	/* The bug both reviews on PR #11 independently found: nothing besides
	   FaultFormComponent used to construct ModalService, so a session that
	   never visited the fault form threw here the first time a decorated
	   method ran, instead of showing the confirm dialog. app.config.ts now
	   forces construction via provideAppInitializer; this pins down exactly
	   what breaks if that wiring is ever removed again. */
	it('throws if ModalService was never constructed before a decorated method runs', () => {
		(ModalService as unknown as { _current: ModalService | null })._current = null;

		expect(() => new Widget().delete('fault-1')).toThrowError(
			'ModalService used before Angular constructed it'
		);
	});
});
