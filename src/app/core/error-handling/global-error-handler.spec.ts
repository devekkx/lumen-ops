import { HttpErrorResponse } from '@angular/common/http';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
	let handler: GlobalErrorHandler;
	let errorSpy: jasmine.Spy;

	beforeEach(() => {
		handler = new GlobalErrorHandler();
		errorSpy = spyOn(console, 'error');
	});

	it('logs an HttpErrorResponse with its status and url, tagged distinctly from a bug', () => {
		const error = new HttpErrorResponse({ status: 500, url: '/api/luminaires' });

		handler.handleError(error);

		expect(errorSpy).toHaveBeenCalledWith('[HTTP]', 500, '/api/luminaires', error);
	});

	it('logs anything else as an unhandled error rather than swallowing it', () => {
		const error = new Error('boom');

		handler.handleError(error);

		expect(errorSpy).toHaveBeenCalledWith('[Unhandled]', error);
	});

	it('never throws back out, even for a non-Error value', () => {
		expect(() => handler.handleError('not an Error instance')).not.toThrow();
		expect(errorSpy).toHaveBeenCalledWith('[Unhandled]', 'not an Error instance');
	});
});
