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
			],
			// A private field or method is only ever seen from inside its own
			// class, so the underscore is a visual flag at the *call site*, not
			// just the declaration - `this._foo` reads as "internal" wherever
			// it's used, without having to go check the modifier.
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: ['classProperty', 'classMethod', 'accessor'],
					modifiers: ['private'],
					format: ['camelCase'],
					leadingUnderscore: 'require'
				}
			]
		}
	},
	{
		// Type-aware rules need real type info, which only src/ has a tsconfig
		// project for (mock-api and scripts are plain tsx/node scripts with no
		// program of their own).
		files: ['src/**/*.ts'],
		ignores: [
			// Neither file is imported from anywhere in the app - both are
			// intentionally-disconnected illustrations of a technique ("the real
			// repo does X") - so neither is part of tsconfig.app.json's or
			// tsconfig.spec.json's program, and a type-aware rule has no type
			// info to check them against.
			'src/app/core/i18n/load-translations.decorator.ts',
			'src/app/shared/directives/with-roles.directive.ts'
		],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.app.json', './tsconfig.spec.json'],
				tsconfigRootDir: __dirname
			}
		},
		rules: {
			// A private field that is never reassigned outside its constructor
			// should say so - readonly is the compiler-enforced guarantee that a
			// leading underscore alone can't give.
			'@typescript-eslint/prefer-readonly': 'error',
			// Two rules that catch real bugs, not just style: a promise dropped
			// without await/catch/void silently swallows its rejection, and
			// passing an async function where a sync callback is expected (an
			// event handler, an array predicate) runs it un-awaited too.
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error'
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
