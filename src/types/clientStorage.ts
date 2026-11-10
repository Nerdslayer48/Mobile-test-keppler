import { emptyClient } from './client';
import type { Client } from './client';
import { companyId, loadCompanyData, saveCompanyData } from './companyAuth';

export const CLIENTS_STORAGE_KEY = "keppler.clients";

export function loadClients(): Client[] {
  try {
    const saved: unknown = loadCompanyData(CLIENTS_STORAGE_KEY, []);
    if (!Array.isArray(saved)) return [];
    return saved.filter((client): client is Client =>
      client !== null && typeof client === "object" &&
      typeof client.id === "string" && typeof client.name === "string" &&
      client.companyId === companyId() &&
      (client.profilePicture === undefined || typeof client.profilePicture === "string") &&
      (client.clientType === "individual" || client.clientType === "company") &&
      Object.keys(emptyClient).every((key) => typeof client[key] === "string")
    );
  } catch {
    return [];
  }
}

export function saveClients(clients: Client[]) {
  return saveCompanyData(CLIENTS_STORAGE_KEY, clients.map(client => ({ ...client, companyId: companyId() })));
}

