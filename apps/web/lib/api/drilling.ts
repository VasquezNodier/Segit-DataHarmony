/**
 * Cliente API para Drilling (FastAPI /api/v1/drilling).
 * Scripts, aplicaciones y documentación con module=drilling en backend.
 */
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPostFormData,
  type ApiClientOptions,
} from "./client";

const BASE = "/api/v1/drilling";

export type ScriptLanguage = "python" | "bash" | "sql";

export interface DrillingScript {
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

function toScript(a: ApiScript): DrillingScript {
  return { ...a, language: a.language as ScriptLanguage };
}

export async function listScripts(
  options?: ApiClientOptions
): Promise<DrillingScript[]> {
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
): Promise<DrillingScript> {
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

export interface DrillingApplication {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
}

export async function listApplications(
  options?: ApiClientOptions
): Promise<DrillingApplication[]> {
  return apiGet<DrillingApplication[]>(`${BASE}/applications`, options);
}

export async function createApplication(
  body: {
    name: string;
    description?: string;
    url: string;
    category?: string;
  },
  options?: ApiClientOptions
): Promise<DrillingApplication> {
  return apiPost<DrillingApplication>(`${BASE}/applications`, body, options);
}

export async function deleteApplication(
  id: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiDelete(`${BASE}/applications/${id}`, options);
}

export type DocType = "markdown" | "link" | "file";

export interface DrillingDocument {
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

function toDocument(a: ApiDocument): DrillingDocument {
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
): Promise<DrillingDocument[]> {
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
): Promise<DrillingDocument> {
  const d = await apiPost<ApiDocument>(`${BASE}/documents`, body, options);
  return toDocument(d);
}

export async function deleteDocument(
  id: string,
  options?: ApiClientOptions
): Promise<void> {
  await apiDelete(`${BASE}/documents/${id}`, options);
}

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
