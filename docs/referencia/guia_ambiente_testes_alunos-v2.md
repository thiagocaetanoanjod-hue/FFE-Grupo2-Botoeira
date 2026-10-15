# Guia de Configuração e Testes Locais — Estação SMART 4.0 (v2 - Com Autenticação)
> **Disciplina:** Frameworks Front-End para Automação Industrial  
> **Objetivo:** Instruções para configuração do ambiente de desenvolvimento, autenticação via WebSocket e testes locais de micro-frontends.

---

## 1. Pré-requisitos do Sistema

Antes de iniciar, certifique-se de ter as seguintes ferramentas instaladas na sua máquina:

* **Node.js**: Versão `18.x` ou superior ([Download Node.js](https://nodejs.org/))
* **VS Code**: Ou IDE de sua preferência (ou via GitHub Codespaces no navegador)
* **Extensão de Navegador**: `single-spa Inspector` (Disponível para Chrome e Firefox)
* **Git**: Para controle de versão e integração contínua

---

## 2. Passo a Passo: Servidor Simulador WebSocket (`mock_server_smart40.js`)

Para testar a recepção de telemetria e o envio de comandos com autenticação ativada, utilizaremos o simulador em Node.js (`mock_server_smart40.js`).

### A. Baixar o arquivo do simulador
Obtenha o arquivo `mock_server_smart40.js` atualizado disponibilizado no repositório do projeto ou no painel Studio e salve-o na raiz da sua pasta de trabalho.

### B. Instalar a dependência `ws`
Abra o terminal no diretório onde salvou o arquivo e execute:

```bash
npm install ws
```

### C. Iniciar o servidor de testes
Execute o comando abaixo no terminal:

```bash
node mock_server_smart40.js
```

Você verá a seguinte mensagem confirmando que o simulador está rodando com segurança ativada:
```text
==================================================
  SIMULADOR WEBSOCKET ESTAÇÃO SMART 4.0 ATIVO
==================================================
  Servidor rodando em: ws://localhost:8080
  Segurança: Autenticação por Token ativada (401/403)
  Tokens válidos: smart40-token-2026, aluno-token-grupo1..5
  Envio de telemetria: A cada 500ms
  Aguardando conexões de clientes Front-End...
```

---

## 3. Autenticação e Conexão WebSocket

O servidor exige um token válido fornecido na URL de conexão (`?token=...`) ou via cabeçalho HTTP durante o *handshake*.

### A. Tokens Pré-autorizados para a Turma
* **Token Padrão / Produção:** `smart40-token-2026`
* **Tokens por Grupo:** `aluno-token-grupo1`, `aluno-token-grupo2`, `aluno-token-grupo3`, `aluno-token-grupo4`, `aluno-token-grupo5`

### B. Teste Rápido no Console do Navegador (Com Token)
Abra qualquer página no navegador, abra o DevTools (**F12**) -> aba **Console** e cole o código abaixo para testar a conexão autenticada:

```javascript
// Conexão Autenticada com Token Válido
const TOKEN = 'smart40-token-2026';
const ws = new WebSocket(`ws://localhost:8080?token=${TOKEN}`);

ws.onopen = () => {
  console.log('✅ Conectado e Autenticado com Sucesso no Simulador SMART 4.0!');
};

ws.onmessage = (event) => {
  const telemetria = JSON.parse(event.data);
  console.log('📡 Telemetria Recebida:', telemetria);
};

ws.onerror = (error) => {
  console.error('❌ Erro na Conexão WebSocket (Verifique Token/CORS/Origem)');
};
```

### C. Teste de Falha de Autenticação (Token Inválido)
Para verificar como o sistema reage a conexões não autorizadas, tente conectar sem o token ou com uma chave incorreta:

```javascript
// Tentativa de Conexão com Token Errado (Retorna 401 Unauthorized)
const wsInvalido = new WebSocket('ws://localhost:8080?token=token-errado');

wsInvalido.onerror = () => {
  console.warn('⚠️ Conexão recusada conforme esperado (401 Unauthorized)!');
};
```

---

## 4. Teste Isolado do Módulo (Grupos 2, 3, 4 e 5)

Cada grupo deve testar seu próprio módulo em sua porta local antes de conectar ao App Shell.

### A. Subir o Servidor de Desenvolvimento
No terminal do seu projeto de micro-frontend (React, Vue, Angular, Svelte), inicie o servidor local:

```bash
# Exemplo para Vite/React/Vue
npm run dev

# Exemplo para Angular
ng serve
```

### B. Portas Padrão Recomendadas
Para evitar conflitos, cada grupo deve configurar sua aplicação para rodar em uma porta fixa:
* **Grupo 1 (App Shell):** `http://localhost:9000`
* **Grupo 2 (IHM Siemens):** `http://localhost:8081`
* **Grupo 3 (Robô Universal Robots):** `http://localhost:8082`
* **Grupo 4 (Rastreabilidade/QR):** `http://localhost:8083`
* **Grupo 5 (Expedição/OEE):** `http://localhost:8084`

---

## 5. Teste de Integração com o App Shell (Grupo 1 + Demais Grupos)

Para testar como o seu micro-frontend funciona dentro da aplicação principal:

1. O **Grupo 1** inicia o App Shell em `http://localhost:9000` (ele conterá a lógica de conexão WebSocket com o token).
2. Seu grupo inicia o módulo local em `http://localhost:808X`.
3. Abra `http://localhost:9000` no navegador.
4. Abra o console do navegador e digite `window.importMapOverrides.enableUI()` para ativar o menu do Single-SPA Inspector.
5. Substitua a URL do módulo remoto da produção pelo seu endereço local (`http://localhost:808X/main.js`).

---

## 6. Resolução de Problemas Frequentes (Troubleshooting)

| Problema | Causa Provável | Solução |
| :--- | :--- | :--- |
| **`WebSocket connection to 'ws://...' failed (401 Unauthorized)`** | Token ausente ou incorreto na URL | Adicione `?token=smart40-token-2026` ao final da URL de conexão do WebSocket. |
| **`WebSocket connection to 'ws://...' failed (403 Forbidden)`** | Cabeçalho `Origin` bloqueado pelo servidor | Verifique se a requisição é proveniente de `localhost` ou adicione o domínio à lista `ORIGENS_PERMITIDAS` em `mock_server_smart40.js`. |
| **Erro de CORS no Console** | O servidor local bloqueou a requisição do App Shell | Adicione `headers: { "Access-Control-Allow-Origin": "*" }` nas configurações do servidor dev (`vite.config.js` ou `webpack.config.js`). |
| **`Error: listen EADDRINUSE :::8080`** | A porta 8080 já está sendo usada por outro processo | Feche outras instâncias do Node ou finalize o processo com `npx kill-port 8080`. |
| **O WebSocket não conecta** | O arquivo `mock_server_smart40.js` não está em execução | Certifique-se de rodar `node mock_server_smart40.js` em uma janela de terminal separada. |
| **Estilos desconfigurados** | Conflito de classes CSS com outro grupo | Verifique se está utilizando o `theme.css` fornecido ou escopando suas classes com CSS Modules/Scoped. |
