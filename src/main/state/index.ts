import { JsonProjectStore, ProjectStore } from './projectStore.js';

let store: ProjectStore | null = null;

export const getProjectStore = (): ProjectStore => {
  if (!store) {
    store = new JsonProjectStore();
  }

  return store;
};
