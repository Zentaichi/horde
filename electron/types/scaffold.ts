export interface ScaffoldTemplate {
  id: string;
  displayName: string;
  minPhpVersion: string;
}

export interface ScaffoldOptions {
  template: string;
  name: string;
  parentDir: string;
}
