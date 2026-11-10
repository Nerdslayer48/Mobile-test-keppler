import { Header } from "./components/01_Heads/Header"
import { Subhead } from "./components/01_Heads/SubHead"
import { Clientlist } from "./components/02_Body/ClientTable"
import { useEffect, useRef, useState } from "react"
import { clientDisplayName } from "./types/client"
import { NewClient } from "./components/03_PopUps/NewClient"
import type { Client, ClientInput } from "./types/client"
import { loadClients, saveClients } from './types/clientStorage';
import { companyId } from './types/companyAuth';

export default function App({ companyName }: { companyName: string }) {
  const [clients, setClients] = useState<Client[]>(loadClients);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visibleClients = clients.filter(client => [client.name, client.firstName, client.lastName, client.companyName, client.email, client.phone].join(' ').toLowerCase().includes(query));

  const lastClients = useRef(clients);
  useEffect(() => {
    if (lastClients.current === clients) return;
    lastClients.current = clients;
    saveClients(clients).catch(() => window.dispatchEvent(new Event("company-storage-error")));
  }, [clients]);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const addClient = (input: ClientInput) => {
    const client: Client = { ...input, companyId: companyId(), id: crypto.randomUUID(), name: clientDisplayName(input) };
    setClients((currentClients) => [...currentClients, client]);
  };

  return (
    <div>
      <Header companyName={companyName} onCreateClient={addClient} search={search} onSearchChange={setSearch} />
      <Subhead />
      <Clientlist clients={visibleClients} onEdit={setEditingClient} searching={!!query} />
      {editingClient && <NewClient
        key={editingClient.id}
        open
        initialValues={editingClient}
        onClose={() => setEditingClient(null)}
        onSave={(input) => setClients((current) => current.map((client) =>
          client.id === editingClient.id
            ? { ...input, companyId: client.companyId, id: client.id, name: clientDisplayName(input) }
            : client
        ))}
        onDelete={() => {
          setClients((current) => current.filter((client) => client.id !== editingClient.id));
          setEditingClient(null);
        }}
      />}
    </div>
  )
}
