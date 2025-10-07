import { app, BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOpenAI } from '@ai-sdk/openai';

import { getProjectStore } from './state/index.js';
import { registerIpcHandlers } from './ipc/index.js';
import { AgentService } from './agent/agent.js';
import { McpIdaClient } from './agent/mcpIdaClient.js';

const isDevelopment = process.env.NODE_ENV === 'development';

const AGENT_SYSTEM_PROMPT = `You are Axel's reverse engineering copilot. Use MCP tools to inspect
binary functions, keep the project snapshot authoritative, and only summarize
what you have verified.`;

const createAgentService = (store: ReturnType<typeof getProjectStore>): AgentService => {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseURL: process.env.OPENAI_BASE_URL
  });

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[axel] OPENAI_API_KEY is not configured — agent chat will be disabled.');
  }

  const modelId = process.env.AXEL_AGENT_MODEL ?? 'gpt-4o-mini';
  const model = openai(modelId);

  const mcpClient = new McpIdaClient(null);

  return new AgentService(store, mcpClient, {
    model,
    systemPrompt: AGENT_SYSTEM_PROMPT
  });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: 'Axel Code Analyzer',
    backgroundColor: '#0d1b2a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Respect the system's dark mode preference for consistent visuals
  if (nativeTheme.shouldUseDarkColors) {
    mainWindow.setBackgroundColor('#0d1b2a');
  }

  const rendererUrl = pathToFileURL(
    path.join(__dirname, '../renderer/index.html')
  ).toString();

  void mainWindow.loadURL(rendererUrl);

  if (isDevelopment) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(async () => {
  const store = getProjectStore();
  await store.load();

  const agent = createAgentService(store);

  registerIpcHandlers({ store, agent });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
