// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const sonarjs = require('eslint-plugin-sonarjs');

module.exports = tseslint.config(
	{
		ignores: ['dist/**', 'coverage/**', '.angular/**']
	},
	{
		files: ['**/*.ts'],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic,
			...angular.configs.tsRecommended,
			sonarjs.configs.recommended
		],
		processor: angular.processInlineTemplates,
		rules: {
			// Every component/directive in this app is prefixed "lumen" - "app"
			// was ng-add's generic default, not this project's actual convention.
			// app-root (below) is the one CLI-mandated exception.
			'@angular-eslint/directive-selector': [
				'error',
				{
					type: 'attribute',
					prefix: 'lumen',
					style: 'camelCase'
				}
			],
			'@angular-eslint/component-selector': [
				'error',
				{
					type: 'element',
					prefix: 'lumen',
					style: 'kebab-case'
				}
			]
		}
	},
	{
		// AppComponent is the one CLI-bootstrapped exception: Angular's own
		// convention (and src/index.html's <app-root>) names the root component
		// "app-root" regardless of the app's own feature-selector prefix.
		files: ['src/app/app.component.ts'],
		rules: {
			'@angular-eslint/component-selector': 'off'
		}
	},
	{
		// The one deliberate exception: this directive's selector matches
		// Bootstrap's own `data-bs-toggle="tooltip"` markup convention on
		// purpose, so template authors write standard Bootstrap HTML instead of
		// a bespoke attribute - see the file's own header comment.
		files: ['src/app/shared/directives/tooltip.directive.ts'],
		rules: {
			'@angular-eslint/directive-selector': 'off'
		}
	},
	{
		files: ['**/*.spec.ts'],
		rules: {
			// Test doubles and fixtures legitimately repeat literals (ids, seed
			// values) and short setup functions across cases; Sonar's duplication
			// rules are tuned for production code, not table-driven specs.
			'sonarjs/no-duplicate-string': 'off',
			'sonarjs/no-identical-functions': 'off'
		}
	},
	{
		files: ['mock-api/**/*.ts'],
		rules: {
			// The seed/mock server intentionally hand-builds a big, static fixture
			// dataset - high in raw literals and lines by nature, not a sign of
			// undesigned production code.
			'sonarjs/no-duplicate-string': 'off',
			'sonarjs/cognitive-complexity': 'off'
		}
	},
	{
		files: ['**/*.html'],
		extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
		rules: {}
	}
);
