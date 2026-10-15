/**
 * Entrada single-spa (build: `npm run build:spa` => dist-spa/main.js, ES module).
 * Import map do Shell:  "@smart40/ihm": "http://localhost:8081/main.js"  (ou URL de produção)
 * O tema (theme.css) é responsabilidade do Shell; aqui injetamos apenas o CSS do G2 (escopado em .g2-root).
 */
import React from 'react';
import ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import App from './App';
import css from './styles/g2.css?inline';

const STYLE_ID = 'smart40-g2-styles';

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: App,
  errorBoundary: () => <div role="alert">Módulo G2 (IHM/Botoeira) falhou ao carregar.</div>,
});

export const bootstrap = lifecycles.bootstrap;
export const mount: typeof lifecycles.mount = async (
  props: Parameters<typeof lifecycles.mount>[0],
) => {
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }
  return lifecycles.mount(props);
};
export const unmount: typeof lifecycles.unmount = async (
  props: Parameters<typeof lifecycles.unmount>[0],
) => {
  await lifecycles.unmount(props);
  document.getElementById(STYLE_ID)?.remove();
};
