export default function (plop) {
  // Set the project name
  plop.setWelcomeMessage('🚀 Welcome to Llama RAG Scaffolder!');
  
  // Helper functions
  plop.setHelper('capitalize', (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  });
  
  plop.setHelper('kebabCase', (text) => {
    return text.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  });
  
  plop.setHelper('camelCase', (text) => {
    return text.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  });
  
  plop.setHelper('pascalCase', (text) => {
    return text.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
  });

  // Generator: New Package
  plop.setGenerator('package', {
    description: 'Create a new package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Package name (kebab-case):',
        validate: (input) => {
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'Package name must be kebab-case starting with a letter';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Package description:'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Package type:',
        choices: [
          { name: 'Library (shared utilities)', value: 'lib' },
          { name: 'API Client', value: 'api' },
          { name: 'UI Components', value: 'ui' },
          { name: 'Database Schema', value: 'db' }
        ]
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/package.json',
        templateFile: 'tools/scaffolder/templates/package/package.json.hbs'
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/tsconfig.json',
        templateFile: 'tools/scaffolder/templates/package/tsconfig.json.hbs'
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/src/index.ts',
        templateFile: 'tools/scaffolder/templates/package/src/index.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/README.md',
        templateFile: 'tools/scaffolder/templates/package/README.md.hbs'
      }
    ]
  });

  // Generator: New App
  plop.setGenerator('app', {
    description: 'Create a new application',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'App name (kebab-case):',
        validate: (input) => {
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'App name must be kebab-case starting with a letter';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'App description:'
      },
      {
        type: 'list',
        name: 'type',
        message: 'App type:',
        choices: [
          { name: 'React App', value: 'react' },
          { name: 'Node.js API', value: 'api' },
          { name: 'Shopify App', value: 'shopify' },
          { name: 'CLI Tool', value: 'cli' }
        ]
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'apps/{{kebabCase name}}/package.json',
        templateFile: 'tools/scaffolder/templates/app/package.json.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{kebabCase name}}/tsconfig.json',
        templateFile: 'tools/scaffolder/templates/app/tsconfig.json.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{kebabCase name}}/src/index.ts',
        templateFile: 'tools/scaffolder/templates/app/src/index.ts.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{kebabCase name}}/README.md',
        templateFile: 'tools/scaffolder/templates/app/README.md.hbs'
      }
    ]
  });

  // Generator: New Component
  plop.setGenerator('component', {
    description: 'Create a new React component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (PascalCase):',
        validate: (input) => {
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
            return 'Component name must be PascalCase';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'package',
        message: 'Target package (e.g., ui-components):',
        default: 'ui-components'
      },
      {
        type: 'confirm',
        name: 'withStyles',
        message: 'Include CSS module?',
        default: true
      },
      {
        type: 'confirm',
        name: 'withTests',
        message: 'Include test file?',
        default: true
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{kebabCase package}}/src/components/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'tools/scaffolder/templates/component/Component.tsx.hbs'
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase package}}/src/components/{{pascalCase name}}/{{pascalCase name}}.module.css',
        templateFile: 'tools/scaffolder/templates/component/Component.module.css.hbs',
        skip: (data) => !data.withStyles
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase package}}/src/components/{{pascalCase name}}/{{pascalCase name}}.test.tsx',
        templateFile: 'tools/scaffolder/templates/component/Component.test.tsx.hbs',
        skip: (data) => !data.withTests
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase package}}/src/components/{{pascalCase name}}/index.ts',
        templateFile: 'tools/scaffolder/templates/component/index.ts.hbs'
      }
    ]
  });

  // Generator: New API Route
  plop.setGenerator('api-route', {
    description: 'Create a new API route',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Route name (kebab-case):',
        validate: (input) => {
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'Route name must be kebab-case starting with a letter';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'app',
        message: 'Target app (e.g., dashboard):',
        default: 'dashboard'
      },
      {
        type: 'list',
        name: 'method',
        message: 'HTTP method:',
        choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      },
      {
        type: 'confirm',
        name: 'withValidation',
        message: 'Include input validation?',
        default: true
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'apps/{{kebabCase app}}/app/routes/api/{{kebabCase name}}.ts',
        templateFile: 'tools/scaffolder/templates/api-route/route.ts.hbs'
      },
      {
        type: 'add',
        path: 'apps/{{kebabCase app}}/app/routes/api/{{kebabCase name}}.test.ts',
        templateFile: 'tools/scaffolder/templates/api-route/route.test.ts.hbs'
      }
    ]
  });

  // Generator: New Hook
  plop.setGenerator('hook', {
    description: 'Create a new React hook',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Hook name (camelCase, starts with "use"):',
        validate: (input) => {
          if (!/^use[A-Z][a-zA-Z0-9]*$/.test(input)) {
            return 'Hook name must be camelCase starting with "use"';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'package',
        message: 'Target package (e.g., ui-components):',
        default: 'ui-components'
      },
      {
        type: 'confirm',
        name: 'withTests',
        message: 'Include test file?',
        default: true
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{kebabCase package}}/src/hooks/{{camelCase name}}.ts',
        templateFile: 'tools/scaffolder/templates/hook/hook.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase package}}/src/hooks/{{camelCase name}}.test.ts',
        templateFile: 'tools/scaffolder/templates/hook/hook.test.ts.hbs',
        skip: (data) => !data.withTests
      }
    ]
  });
};
