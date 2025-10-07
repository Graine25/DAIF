import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export interface DaifPaths {
  base: string;
  chats: string;
  flowchart: string;
  decomp: string;
}

const DIRECTORY_NAMES = {
  base: 'DAIF',
  chats: 'Chats',
  flowchart: 'Flowchart',
  decomp: 'decomp'
} as const;

let cachedPaths: DaifPaths | null = null;

const computePaths = (): DaifPaths => {
  if (cachedPaths) {
    return cachedPaths;
  }

  const documentsPath = app.getPath('documents');
  const base = path.join(documentsPath, DIRECTORY_NAMES.base);
  cachedPaths = {
    base,
    chats: path.join(base, DIRECTORY_NAMES.chats),
    flowchart: path.join(base, DIRECTORY_NAMES.flowchart),
    decomp: path.join(base, DIRECTORY_NAMES.decomp)
  } satisfies DaifPaths;

  return cachedPaths;
};

export const getDaifPaths = (): DaifPaths => computePaths();

export const ensureDaifStructure = async (): Promise<DaifPaths> => {
  const paths = computePaths();

  await fs.mkdir(paths.base, { recursive: true });
  await Promise.all([
    fs.mkdir(paths.chats, { recursive: true }),
    fs.mkdir(paths.flowchart, { recursive: true }),
    fs.mkdir(paths.decomp, { recursive: true })
  ]);

  return paths;
};
