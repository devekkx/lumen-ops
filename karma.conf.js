// Karma configuration file

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
			jasmine: {}
		},
		jasmineHtmlReporter: {
			suppressAll: true // removes the duplicated traces
		},
		coverageReporter: {
			dir: require('path').join(__dirname, './coverage/lumen-ops'),
			subdir: '.',
			reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcovonly' }],
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
				flags: ['--no-sandbox', '--disable-gpu', '--window-size=1400,900']
			}
		},
		restartOnFileChange: true
	});
};
