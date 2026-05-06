export interface PackagephobiaSizeInfo {
  bytes: number;
  files: number;
  pretty: string;
  color: string;
}

export interface PackagephobiaSize {
  publish: PackagephobiaSizeInfo;
  install: PackagephobiaSizeInfo;
}
