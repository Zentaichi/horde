export interface ServiceStatus {
  serviceId: string;
  providerId: string;
  engine?: string;
  displayName: string;
  running: boolean;
  pid?: number;
  port?: number;
}

export interface IServiceProvider {
  readonly providerId: string;
  readonly displayName: string;
  getStatuses(): Promise<ServiceStatus[]>;
  reattachOrphans?(): Promise<void>;
}
