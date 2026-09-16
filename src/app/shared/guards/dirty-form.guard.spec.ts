import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { DirtyFormHost, dirtyFormGuard } from './dirty-form.guard';

/* Deliberately not routed through TestBed/Router - the guard only ever calls
   two methods on whatever component it is handed, so a plain fake exercising
   those two methods is a more direct proof than standing up a real route
   navigation would be. */
class FakeHost implements DirtyFormHost {
	dirty = false;
	discardResult: Promise<boolean> = Promise.resolve(true);
	confirmDiscardCalls = 0;

	isDirty(): boolean {
		return this.dirty;
	}

	confirmDiscard(): Promise<boolean> {
		this.confirmDiscardCalls++;
		return this.discardResult;
	}
}

describe('dirtyFormGuard', () => {
	it('allows navigation without prompting when the form is clean', () => {
		const host = new FakeHost();
		host.dirty = false;

		const result = dirtyFormGuard(host, undefined as never, undefined as never, undefined as never);

		expect(result).toBe(true);
		expect(host.confirmDiscardCalls).toBe(0);
	});

	it('asks the host to confirm discarding when the form is dirty', fakeAsync(() => {
		const host = new FakeHost();
		host.dirty = true;
		host.discardResult = Promise.resolve(true);

		const result = dirtyFormGuard(
			host,
			undefined as never,
			undefined as never,
			undefined as never
		) as Promise<boolean>;

		expect(host.confirmDiscardCalls).toBe(1);
		expect(result).toBeInstanceOf(Promise);

		let resolved: boolean | undefined;
		result.then((value) => (resolved = value));
		flushMicrotasks();

		expect(resolved).toBe(true);
	}));

	it('blocks navigation when the host reports the user chose to stay', fakeAsync(() => {
		const host = new FakeHost();
		host.dirty = true;
		host.discardResult = Promise.resolve(false);

		const result = dirtyFormGuard(
			host,
			undefined as never,
			undefined as never,
			undefined as never
		) as Promise<boolean>;

		let resolved: boolean | undefined;
		result.then((value) => (resolved = value));
		flushMicrotasks();

		expect(resolved).toBe(false);
	}));
});
