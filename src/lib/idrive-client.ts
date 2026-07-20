import {
  CloudDriveClient,
  ConfigStore,
  defaultLocations,
  EngineRunner,
  IdDriveAuthClient,
  ProcessRunner,
} from "idrive-cli";

import type { IDriveEntry } from "@/lib/idrive";

export type IDriveClient = Pick<CloudDriveClient, "download" | "list" | "status">;

export interface IDriveOperationOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function listIdrive(
  remotePath: string,
  options: IDriveOperationOptions = {},
  client: IDriveClient = defaultClient(),
): Promise<IDriveEntry[]> {
  return await client.list(remotePath, {
    detailed: true,
    ...operationOptions(options, 30 * 60 * 1000),
  });
}

export async function downloadIdrive(
  remoteFile: string,
  destination: string,
  options: IDriveOperationOptions = {},
  client: IDriveClient = defaultClient(),
): Promise<string> {
  return await client.download(remoteFile, destination, operationOptions(options, 30 * 60 * 1000));
}

export async function assertIdriveReady(client: IDriveClient = defaultClient()): Promise<void> {
  const status = await client.status();
  if (!status.engineInstalled) {
    throw new Error("IDrive transfer engine is not installed or failed its integrity check");
  }
  if (!status.loggedIn) {
    throw new Error("IDrive worker profile is not configured");
  }
}

export function idriveLocations(environment: NodeJS.ProcessEnv = process.env) {
  const locations = defaultLocations(environment);
  if (environment.IDRIVE_WORKER_TEMP_DIR) {
    locations.temporaryDirectory = environment.IDRIVE_WORKER_TEMP_DIR;
  }
  return locations;
}

let sharedClient: IDriveClient | undefined;

function defaultClient(): IDriveClient {
  if (sharedClient) return sharedClient;
  const locations = idriveLocations();
  const runner = new ProcessRunner();
  const client = new CloudDriveClient(
    new IdDriveAuthClient(),
    new ConfigStore(locations.configFile),
    new EngineRunner(runner, locations),
    locations,
  );
  sharedClient = client;
  return client;
}

function operationOptions(options: IDriveOperationOptions, defaultTimeoutMs: number) {
  return {
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
    timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
  };
}
