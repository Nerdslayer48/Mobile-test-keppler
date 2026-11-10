import { companyId } from './companyAuth';
import { api, apiResponse } from './api';

export interface CardInput {
  id: string; text: string; width?: number; height?: number;
  media?: { id: string; name: string; kind: 'image' | 'video'; file: Blob; url?: string }[];
}
export interface BoardMedia {
  companyId?: string; id: string; name: string;
  kind: 'image' | 'video' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'section';
  file?: Blob; height?: number; text?: string; title?: string; inputs?: CardInput[];
  connections?: string[]; connectionPorts?: Record<string, { source: 'top' | 'right' | 'bottom' | 'left'; target: 'top' | 'right' | 'bottom' | 'left' }>;
  flipLine?: boolean; x: number; y: number; width?: number;
}
interface FileRef { mediaId: string; type: string }
const versions = new Map<string, number>();
const uploaded = new WeakMap<Blob, Promise<FileRef>>();
function upload(file: Blob) {
  const known = uploaded.get(file); if (known) return known;
  if (file.size > 64 * 1024 * 1024) return Promise.reject(new Error('Media uploads must be 64 MB or smaller.'));
  const pending = api<FileRef>(`/media?type=${encodeURIComponent(file.type)}`, { method:'POST', headers:{'Content-Type':'application/octet-stream'}, body:file });
  uploaded.set(file,pending); pending.catch(()=>uploaded.delete(file)); return pending;
}
async function encode(value: unknown): Promise<unknown> {
  if (value instanceof Blob) return upload(value);
  if (Array.isArray(value)) return Promise.all(value.map(encode));
  if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).filter(([key])=>key!=='url').map(async([key,item])=>[key,await encode(item)])));
  return value;
}
async function decode(value: unknown, files: Map<string, Promise<Blob>>, signal?: AbortSignal): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(item=>decode(item,files,signal)));
  if (value && typeof value === 'object') {
    if ('mediaId' in value && 'type' in value && typeof value.mediaId==='string' && typeof value.type==='string') {
      const ref=value as FileRef;
      if(!files.has(ref.mediaId))files.set(ref.mediaId,apiResponse(`/media/${encodeURIComponent(ref.mediaId)}`, {signal}).then(response=>response.blob()).then(blob=>{const file=new Blob([blob],{type:ref.type});uploaded.set(file,Promise.resolve(ref));return file;}));
      return files.get(ref.mediaId);
    }
    return Object.fromEntries(await Promise.all(Object.entries(value).map(async([key,item])=>[key,await decode(item,files,signal)])));
  }
  return value;
}
function route(key:string){if(JSON.parse(key)[0]!==companyId())throw new Error('Workspace does not belong to this company.');return `/boards/${encodeURIComponent(key)}`;}
export async function readBoard(key:string, signal?:AbortSignal):Promise<BoardMedia[]> {
  const record=await api<{value:unknown[];version:number}>(route(key), {signal});
  const items=await decode(record.value,new Map(),signal) as BoardMedia[];
  signal?.throwIfAborted();
  versions.set(key,record.version);
  return items;
}
export async function writeBoard(key:string,items:BoardMedia[]):Promise<void> {
  const path=route(key);const value=await encode(items);const record=await api<{version:number}>(path,{method:'PUT',body:JSON.stringify({value,version:versions.get(key)??0})});versions.set(key,record.version);
}
