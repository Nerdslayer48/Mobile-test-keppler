import { emptyClient } from './client';
import type { Client } from './client';

export const CLIENTS_STORAGE_KEY = "keppler.clients";

export function loadClients(): Client[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(CLIENTS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((client): client is Client =>
      client !== null && typeof client === "object" &&
      typeof client.id === "string" && typeof client.name === "string" &&
      (client.clientType === "individual" || client.clientType === "company") &&
      Object.keys(emptyClient).every((key) => typeof client[key] === "string")
    );
  } catch {
    return [];
  }
}

