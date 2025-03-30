const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			globals: {
				...globals.node
			}
		},
		rules: {
			'arrow-spacing': ['warn', { before: true, after: true }],
			'comma-spacing': 'error',
			'comma-style': 'error',
			'dot-location': ['error', 'property'],
			'handle-callback-err': 'off',
			'keyword-spacing': 'error',
			'no-console': 'off',
			'no-empty-function': 'error',
			'no-floating-decimal': 'error',
			'no-inline-comments': 'error',
			'no-lonely-if': 'error',
			'no-multi-spaces': 'error',
			'no-shadow': ['error', { allow: ['err', 'resolve', 'reject'] }],
			'no-trailing-spaces': ['error'],
			'no-var': 'error',
			'no-undef': 'error',
			'no-unused-vars': ['error'],
			"no-invalid-this": "error",
			"no-use-before-define": ["error", { "functions": true, "classes": true }],
			'object-curly-spacing': ['error', 'always'],
			'prefer-const': 'error',
			semi: ['error', 'always'],
			'space-before-blocks': 'error',
			'space-before-function-paren': ['error', {
				anonymous: 'never',
				named: 'never',
				asyncArrow: 'always',
			}],
			'space-in-parens': 'error',
			'space-infix-ops': 'error',
			'space-unary-ops': 'error',
			'spaced-comment': 'error',
			yoda: 'error',
		},
	},
];