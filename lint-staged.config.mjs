// Executa apenas nos arquivos staged (rapido).
// eslint --config é obrigatório porque em monorepo workspaces o lint-staged
// roda do root e o eslint v9 não faz auto-discovery a partir do caminho do arquivo.
// eslint-plugin-prettier já roda prettier dentro do eslint em api/web.
export default {
  'apps/api/**/*.ts': [
    'eslint --config apps/api/eslint.config.mjs --fix --no-warn-ignored',
  ],
  'apps/web/**/*.{ts,tsx}': [
    'eslint --config apps/web/eslint.config.mjs --fix --no-warn-ignored',
  ],
  'packages/**/*.ts': ['prettier --write'],
  '*.{md,json,yml,yaml,css}': ['prettier --write'],
};
