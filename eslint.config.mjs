import eslint from '@eslint/js';
import angular from 'angular-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
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
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: ['classProperty', 'classMethod', 'accessor'],
					modifiers: ['private'],
					format: ['camelCase'],
					leadingUnderscore: 'require'
				},
				{
					selector: 'classProperty',
					modifiers: ['private', 'static', 'readonly'],
					format: ['UPPER_CASE'],
					leadingUnderscore: 'require'
				}
			]
		}
	},
	{
		files: ['src/**/*.ts'],
		ignores: [
			'src/app/core/i18n/load-translations.decorator.ts',
			'src/app/shared/directives/with-roles.directive.ts'
		],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.app.json', './tsconfig.spec.json'],
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error'
		}
	},
	{
		files: ['src/app/app.component.ts'],
		rules: {
			'@angular-eslint/component-selector': 'off'
		}
	},
	{
		files: ['src/app/shared/directives/tooltip.directive.ts'],
		rules: {
			'@angular-eslint/directive-selector': 'off'
		}
	},
	{
		files: ['**/*.spec.ts'],
		rules: {
			'sonarjs/no-duplicate-string': 'off',
			'sonarjs/no-identical-functions': 'off'
		}
	},
	{
		files: ['mock-api/**/*.ts'],
		rules: {
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
