import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import './styles/g2.css';

/**
 * Ponto de entrada para o App Shell (G1). Independe do orquestrador (ADR ainda em aberto):
 * - Single-SPA: `export const mount = (props) => mount(props.domElement)` etc.
 * - Módulo local no Shell: `import { mount } from 'smart40-g2-ihm-botoeira/mfe'`.
 * O theme.css global vem do Shell (não importamos aqui para não duplicar/sobrescrever variáveis).
 */
let root: Root | null = null;

export function mount(container: HTMLElement) {
  root = createRoot(container);
  root.render(<App />);
}

export function unmount() {
  root?.unmount();
  root = null;
}
