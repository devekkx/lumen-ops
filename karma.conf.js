// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
//
// This project's angular.json `test` target has no `karmaConfig` entry of its
// own until this file exists; it is wired in there as
// architect.test.options.karmaConfig so `ng test` picks this up instead of
// the builder's bare defaults, which do not expose coverage thresholds.

module.exports = function (config) {
	config.set({
		basePath: '',
		frameworks: ['jasmine', '@angular-devkit/build-angular'],
		plugins: [
			require('karma-jasmine'),
			require('karma-chrome-launcher'),
			require('karma-jasmine-html-reporter'),
			require('karma-coverage'),
			require('@angular-devkit/build-angular/plugins/karma')
		],
		client: {
			jasmine: {
				// you can add configuration options for Jasmine here
				// the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
				// for example, you can disable the random execution with `random: false`
				// or set a specific seed with `seed: 4321`
			}
		},
		jasmineHtmlReporter: {
			suppressAll: true // removes the duplicated traces
		},
		coverageReporter: {
			dir: require('path').join(__dirname, './coverage/lumen-ops'),
			subdir: '.',
			reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcovonly' }],
			/* No headless browser exists in the sandbox this suite was written
			 * in, so `ng test` has never actually executed here and there is no
			 * measured baseline to set a real threshold from. These numbers are
			 * a conservative floor chosen from the shape of the suite (every
			 * pure-logic module — the filter DSL, guards, pipes, validators,
			 * the two table bases — has a thorough spec; several components with
			 * real branching, like the fault form and the OL/ECharts wrappers,
			 * do not), not a target measured and then padded down. `check.global`
			 * fails the `ng test` run under threshold rather than merely
			 * reporting it, which is deliberate — a badge nobody enforces is not
			 * a gate. Whoever runs this suite for the first time for real should
			 * treat these as provisional and tighten (or loosen, if they turn out
			 * optimistic) them once an actual number exists.
			 */
			check: {
				global: {
					statements: 60,
					lines: 60,
					functions: 55,
					branches: 40
				}
			}
		},
		reporters: ['progress', 'kjhtml'],
		browsers: ['Chrome'],
		customLaunchers: {
			ChromeHeadlessCI: {
				base: 'ChromeHeadless',
				flags: ['--no-sandbox', '--disable-gpu']
			}
		},
		restartOnFileChange: true
	});
};
