/**
 * Cliente API para Geology & Geophysics (FastAPI /api/v1/gyg).
 *
 * Expone:
 *  - Operational routines
 *  - Scripts de código (Python, Bash, SQL)
 *  - Aplicaciones externas
 *  - Documentación (markdown, links, archivos)
 *  - Archivos adjuntos
 */
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPostFormData,
  type ApiClientOptions,
} from "./client";

const BASE = "/api/v1/gyg";

// ── Routines ──────────────────────────────────────────────────────────────────

export interface Param {
  key: string;
  label: string;
  required?: boolean;
}

export interface FileInput {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
}

export interface GygRoutine {
  id: string;
  slug: string;
  name: string;
  description: string;
  script: string;
  params: Param[];
  fileInputs: FileInput[];
  needsDatasource: boolean;
  module: string;
  /** volume_path = split layout with volume + directory explorer */
  executionProfile?: "default" | "volume_path";
}

export interface DatasourceOption {
  id: string;
  name: string;
  type: string;
}

export async function listRoutines(
  options?: ApiClientOptions,
  module?: string
): Promise<GygRoutine[]> {
  const qs = module ? `?module=${encodeURIComponent(module)}` : "";
  return apiGet<GygRoutine[]>(`${BASE}/routines${qs}`, options);
}

export async function getRoutine(
  idOrSlug: string,
  options?: ApiClientOptions
): Promise<GygRoutine> {
  return apiGet<GygRoutine>(`${BASE}/routines/${idOrSlug}`, options);
}

export async function getRoutineDatasources(
  routineId: string,
  moduleId: string,
  options?: ApiClientOptions
): Promise<DatasourceOption[]> {
  const qs = `?moduleId=${encodeURIComponent(moduleId)}`;
  return apiGet<DatasourceOption[]>(
    `${BASE}/routines/${routineId}/datasources${qs}`,
    options
  );
}

// ── Scripts ───────────────────────────────────────────────────────────────────

export type ScriptLanguage = "python" | "bash" | "sql";

export interface GygScript {
  id: string;
  name: string;
  description: string;
  language: ScriptLanguage;
  content: string;
}

interface ApiScript {
  id: string;
  name: string;
  description: string;
  language: string;
  content: string;
}

function toScript(a: ApiScript): GygScript {
  return { ...a, language: a.language as ScriptLanguage };
}

export async function listScripts(options?: ApiClientOptions): Promise<GygScript[]> {
  const list = await apiGet<ApiScript[]>(`${BASE}/scripts`, options);
  return list.map(toScript);
}

export async function createScript(
  body: {
    name: string;
    description?: string;
    language: ScriptLanguage;
    content?: string;
  },
  options?: ApiClientOptions
): Promise<GygScript> {
  const s = await apiPost<ApiScript>(`${BASE}/scripts`, body, options);
  return toScript(s);
}

export async function updateScriptContent(
  id: string,
  content: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiPut(`${BASE}/scripts/${id}`, { content }, options);
}

export async function deleteScript(
  id: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiDelete(`${BASE}/scripts/${id}`, options);
}

// ── Applications ──────────────────────────────────────────────────────────────

export interface GygApplication {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
}

export async function listApplications(
  options?: ApiClientOptions
): Promise<GygApplication[]> {
  return apiGet<GygApplication[]>(`${BASE}/applications`, options);
}

export async function createApplication(
  body: {
    name: string;
    description?: string;
    url: string;
    category?: string;
  },
  options?: ApiClientOptions
): Promise<GygApplication> {
  return apiPost<GygApplication>(`${BASE}/applications`, body, options);
}

export async function deleteApplication(
  id: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiDelete(`${BASE}/applications/${id}`, options);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export type DocType = "markdown" | "link" | "file";

export interface GygDocument {
  id: string;
  title: string;
  description: string;
  type: DocType;
  content?: string | null;
  url?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

interface ApiDocument {
  id: string;
  title: string;
  description: string;
  type: string;
  content?: string | null;
  url?: string | null;
  file_id?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
}

function toDocument(a: ApiDocument): GygDocument {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type as DocType,
    content: a.content,
    url: a.url,
    fileId: a.file_id ?? undefined,
    fileName: a.file_name ?? undefined,
    mimeType: a.mime_type ?? undefined,
    fileSize: a.file_size ?? undefined,
  };
}

export async function listDocuments(
  options?: ApiClientOptions
): Promise<GygDocument[]> {
  const list = await apiGet<ApiDocument[]>(`${BASE}/documents`, options);
  return list.map(toDocument);
}

export async function createDocument(
  body: {
    title: string;
    description?: string;
    type: DocType;
    content?: string | null;
    url?: string | null;
    file_id?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    file_size?: number | null;
  },
  options?: ApiClientOptions
): Promise<GygDocument> {
  const d = await apiPost<ApiDocument>(`${BASE}/documents`, body, options);
  return toDocument(d);
}

export async function deleteDocument(
  id: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiDelete(`${BASE}/documents/${id}`, options);
}

// ── Files ─────────────────────────────────────────────────────────────────────

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function uploadFile(
  file: File,
  options?: ApiClientOptions
): Promise<FileUploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  return apiPostFormData<FileUploadResult>(`${BASE}/files`, fd, options);
}
