module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',  // ← keeps core hooks rules
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', '**/*.css', '**/*.module.css', '**/*.txt'],  // ← ADD THESE to skip CSS/TXT
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-hooks/react-compiler': 'warn',  // ← this is the correct name; start with 'warn'
  },
}