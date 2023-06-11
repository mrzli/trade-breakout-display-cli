const { getEsLintConfig } = require('@gmjs/eslint-config');

const config = getEsLintConfig({ projectType: 'node' });

module.exports = {
  ...config,
};
