import { registerProjectIpc } from './projectIpc.js';
import { ProjectStore } from '../state/projectStore.js';

export const registerIpcHandlers = (store: ProjectStore): void => {
  registerProjectIpc(store);
};
