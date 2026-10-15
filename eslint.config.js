import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-spa', 'node_modules', 'src/lib', 'src/contracts', 'src/mfe.tsx', 'src/state/store.ts', 'src/state/store.test.ts', 'src/state/useSmart40.ts', 'src/components/HmiTouch.tsx', 'src/components/Indicators.tsx', 'src/components/EventLog.tsx', 'src/dev/DevPanel.tsx', 'src/dev/mockBus.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
);
