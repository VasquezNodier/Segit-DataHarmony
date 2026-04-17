/**
 * Cliente API del módulo de cartografía.
 * Consume los endpoints de FastAPI en /api/v1/cartography.
 */
import { apiPost, type ApiClientOptions } from "./client";

const BASE = "/api/v1/cartography";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SplitPreviewRequest {
  volumeId: string;
  sourcePath: string;
  destPath: string;
}

export interface SplitExecuteRequest extends SplitPreviewRequest {
  overwriteExisting?: boolean;
}

export interface FileInPlan {
  name: string;
  extension: "pdf" | "mxd";
}

export interface WellPlan {
  well: string;
  cr: string;
  isOwner: boolean;
  newDirName: string;
  targetDirPath: string;
  files: FileInPlan[];
  willMove: boolean;
}

export interface ConflictEntry {
  path: string;
  reason: string;
}

export interface SplitSummary {
  newDirsToCreate: number;
  filesToMove: number;
  shpCopiesPlanned: number;
}

export interface OwnerInfo {
  well: string;
  cr: string;
}

export interface SplitPreviewResponse {
  sourcePath: string;
  destPath: string;
  sourceDirName: string;
  ownerWell: OwnerInfo;
  detectedWells: WellPlan[];
  shpFolders: string[];
  unmatchedFiles: string[];
  conflicts: ConflictEntry[];
  summary: SplitSummary;
}

export interface SplitExecuteResponse {
  jobId: string;
  taskId: string | null;
  status: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function previewSplit(
  body: SplitPreviewRequest,
  options?: ApiClientOptions,
): Promise<SplitPreviewResponse> {
  return apiPost<SplitPreviewResponse>(`${BASE}/split/preview`, body, options);
}

export async function executeSplit(
  body: SplitExecuteRequest,
  options?: ApiClientOptions,
): Promise<SplitExecuteResponse> {
  return apiPost<SplitExecuteResponse>(`${BASE}/split/execute`, body, options);
}
