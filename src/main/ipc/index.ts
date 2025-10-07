import { registerProjectIpc } from './projectIpc.js';
import { registerAgentIpc } from './agentIpc.js';
import type { ProjectStore } from '../state/projectStore.js';
import type { AgentService } from '../agent/agent.js';

type IpcDependencies = {
  store: ProjectStore;
  agent: AgentService;
};

export const registerIpcHandlers = ({ store, agent }: IpcDependencies): void => {
  registerProjectIpc(store);
  registerAgentIpc(agent);
};
