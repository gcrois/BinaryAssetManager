module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:react-hooks/recommended",
	],
	ignorePatterns: ["docs"],
	parser: "@typescript-eslint/parser",
	plugins: ["react-refresh"],
	rules: {
		"react-refresh/only-export-components": [
			"warn",
			{ allowConstantExport: true },
		],
		"@typescript-eslint/naming-convention": [
			"error",
			{
				selector: "function",
				format: ["camelCase", "PascalCase"],
			},
		],
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": [
			"warn",
			{
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
				caughtErrorsIgnorePattern: "^_",
			},
		],
		"@typescript-eslint/quotes": [
			"warn",
			"double",
			{
				avoidEscape: true,
				allowTemplateLiterals: true,
			},
		],
		// allow mixed tabs and spaces for indentation
		"no-mixed-spaces-and-tabs": "off",
		// "react/no-unknown-property": ["error", { ignore: ["css"] }],
	},
};
