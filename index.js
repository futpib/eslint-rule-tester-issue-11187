
const {RuleTester, CLIEngine} = require('eslint');

const getNameReplacement = name => {
	if (name === 'a') {
		return 'alpha';
	}

	if (name === 'b') {
		return 'beta';
	}
};

const variableIdentifiers = variable => [
	...variable.identifiers,
	...variable.references.map(reference => reference.identifier)
];

const create = context => {
	console.log('='.repeat(80));
	console.log('getSource:', context.getSource());

	const checkVariable = variable => {
		const replacement = getNameReplacement(variable.name);

		if (!replacement) {
			return;
		}

		const [definition] = variable.defs;

		const problem = {
			node: definition.name,
			message: 'foo',
			fix: fixer => {
				const fixes = variableIdentifiers(variable).map(identifier => fixer.replaceText(identifier, replacement));
				console.log('fixes:', fixes);
				return fixes;
			}
		};

		context.report(problem);
	};

	const checkVariables = scope => {
		scope.variables.forEach(checkVariable);
	};

	const checkChildScopes = scope => {
		scope.childScopes.forEach(checkScope);
	};

	const checkScope = scope => {
		checkVariables(scope);

		return checkChildScopes(scope);
	};

	return {
		'Program:exit'() {
			checkScope(context.getScope());
		}
	};
};

const rule = {
	create,
	meta: {
		fixable: 'code'
	}
};

const parserOptions = {
	ecmaVersion: 6
};

const ruleTester = new RuleTester({
	parserOptions
});

const errors = [{ruleId: 'rule'}, {ruleId: 'rule'}];

const tests = {
	valid: [
	],
	invalid: [
		{
			code: 'let a, b',
			output: 'let alpha, beta',
			errors
		},
		{
			code: `
				let a, b;
				console.log(a, b);
			`,
			output: `
				let alpha, beta;
				console.log(alpha, beta);
			`,
			errors
		}
	]
};

const cliEngine = new CLIEngine({
	fix: false,
	parserOptions
});

console.log('-'.repeat(80));
console.log('Running with CLIEngine');

cliEngine.linter.defineRule('rule', rule);

for (const test of tests.invalid) {
	const result = cliEngine.executeOnText(test.code);
	console.log('executeOnText:', JSON.stringify(result, null, 2));
}

console.log('-'.repeat(80));
console.log('Running with RuleTester');

try {
	ruleTester.run('rule', rule, tests);
} catch (error) {
	console.log('actual:', error.actual);
	console.log('expected:', error.expected);
	throw error;
}
