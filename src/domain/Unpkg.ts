export interface UnpkgFile {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  mode?: number;
  mtime?: string;
  files?: UnpkgFile[];
}
