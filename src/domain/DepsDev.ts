export interface DepsDevVersionKey {
  system: string;
  name: string;
  version: string;
}

export interface DepsDevDependencyNode {
  versionKey: DepsDevVersionKey;
  bundled: boolean;
  relation: 'SELF' | 'DIRECT' | 'INDIRECT';
  errors: string[];
}

export interface DepsDevDependencyEdge {
  fromNode: number;
  toNode: number;
  requirement: string;
}

export interface DepsDevDependencies {
  nodes: DepsDevDependencyNode[];
  edges: DepsDevDependencyEdge[];
  error?: string;
}
