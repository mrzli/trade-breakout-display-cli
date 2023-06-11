import { join } from 'node:path';
import { cli } from '@gmjs/cli-wrapper';
import { readPackageJsonSync } from '@gmjs/package-json';

export function run(): void {
  const result = cli(
    `
Usage
  $ test-command <input>

Options
  --config, -c  Path to config file
  --output, -o  Output directory
  --project-name, -p  Project name

Examples
  $ test-command --config config.json --output . --project-name my-project
`,
    {
      meta: {
        version: readPackageJsonSync(join(__dirname, '..')).version ?? '',
      },
      options: {
        config: {
          type: 'string',
          short: 'c',
          required: true,
        },
        output: {
          type: 'string',
          short: 'o',
          required: false,
        },
        projectName: {
          type: 'string',
          short: 'p',
          required: false,
        },
      },
    }
  );

  console.log(result);
}

run();
