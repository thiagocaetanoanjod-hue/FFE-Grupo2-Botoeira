// Entrada STANDALONE (http://localhost:8081). Dentro do App Shell, usa-se `spa-entry.tsx`.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DevHarness } from './dev/DevHarness';
import './styles/theme.css'; // no Shell, o tema é importado pelo G1
import './styles/g2.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <DevHarness />
  </React.StrictMode>,
);
