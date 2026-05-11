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
  zipsPlanned: number;
  ownerDirWillMove: boolean;
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
  gdbFound: string | null;
  zipsToCreate: string[];
  warnings: string[];
  summary: SplitSummary;
}

export interface SplitExecuteResponse {
  jobId: string;
  taskId: string | null;
  status: string;
}

export interface ZipPackPreviewRequest {
  volumeId: string;
  destPath: string;
  gdbPath: string;
  dirsToZip: string[];
}

export interface ZipPackExecuteRequest extends ZipPackPreviewRequest {
  overwriteExisting?: boolean;
}

export interface ZipPackPreviewResponse {
  destPath: string;
  gdbPath: string;
  gdbFound: string;
  dirsToZip: string[];
  zipsToCreate: string[];
  conflicts: ConflictEntry[];
  warnings: string[];
}

export interface ZipResultEntry {
  zipName: string;
  path: string;
  status: string;
  message: string;
  sizeBytes?: number | null;
}

export interface CartographySplitJobResult {
  service?: string;
  ownerWell?: OwnerInfo;
  sourcePath?: string;
  destPath?: string;
  createdDirs?: string[];
  movedFiles?: Array<{
    well: string;
    cr: string;
    name: string;
    from: string;
    to: string;
  }>;
  shpCopies?: Array<{ well: string; cr: string; from: string; to: string }>;
  unmatchedFiles?: string[];
  ownerDirMovedTo?: string | null;
  zipResults?: ZipResultEntry[];
  gdbUsed?: string | null;
  summary?: {
    newDirsCreated?: number;
    filesMoved?: number;
    shpCopiesDone?: number;
    zipsOk?: number;
    zipsTotal?: number;
  };
}

export interface CartographyZipPackJobResult {
  service?: string;
  destPath?: string;
  gdbPath?: string;
  gdbUsed?: string | null;
  zipResults?: ZipResultEntry[];
  summary?: { zipsOk?: number; zipsTotal?: number };
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

export async function previewZipPack(
  body: ZipPackPreviewRequest,
  options?: ApiClientOptions,
): Promise<ZipPackPreviewResponse> {
  return apiPost<ZipPackPreviewResponse>(`${BASE}/zip/preview`, body, options);
}

export async function executeZipPack(
  body: ZipPackExecuteRequest,
  options?: ApiClientOptions,
): Promise<SplitExecuteResponse> {
  return apiPost<SplitExecuteResponse>(`${BASE}/zip/execute`, body, options);
}
