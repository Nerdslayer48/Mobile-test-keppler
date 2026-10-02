import { Header } from "./components/01_Heads/Header"
import { Subhead } from "./components/01_Heads/SubHead"
import { Clientlist } from "./components/02_Body/ClientTable"
import { useEffect, useState } from "react"
import { clientDisplayName } from "./types/client"
import { NewClient } from "./components/03_PopUps/NewClient"
import type { Client, ClientInput } from "./types/client"
import { CLIENTS_STORAGE_KEY, loadClients } from './types/clientStorage';

export default function App() {
  const [clients, setClients] = useState<Client[]>(loadClients);

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    } catch (error) {
      console.error("Unable to save clients to local storage", error);
    }
  }, [clients]);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const addClient = (input: ClientInput) => {
    const client: Client = { ...input, id: crypto.randomUUID(), name: clientDisplayName(input) };
    setClients((currentClients) => [...currentClients, client]);
  };

  return (
    <div>
      <Header onCreateClient={addClient} />
      <Subhead />
      <Clientlist clients={clients} onEdit={setEditingClient} />
      {editingClient && <NewClient
        key={editingClient.id}
        open
        initialValues={editingClient}
        onClose={() => setEditingClient(null)}
        onSave={(input) => setClients((current) => current.map((client) =>
          client.id === editingClient.id
            ? { ...input, id: client.id, name: clientDisplayName(input) }
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
