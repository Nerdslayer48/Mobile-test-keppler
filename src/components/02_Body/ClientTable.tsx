
import { useState } from "react";
import { InvoiceModal } from "../03_PopUps/InvoiceModal";
import { Clientbox } from "./CLientBox";
import type { Client } from "../../types/client";

export function Clientlist({ clients = [], onEdit, searching = false }: { clients?: Client[]; onEdit?: (client: Client) => void; searching?: boolean }){
    const [invoiceClient, setInvoiceClient] = useState<Client | null>(null);
    return(
        
        <div className="bg-surface h-screen mx-[50px] rounded-tl-[16px] rounded-tr-[16px]
        pt-[20px] border-border border-1 border-b-0 flex flex-col
        min-w-[1340px]">

        {/* items names */}

            <div className="flex flex-row text-[13px] font-montserrat font-semibold text-text-primary pb-5 pl-[40px] pr-[110px]">
                <div className="min-w-[300px] flex flex-1"><h1 className=" max-h-[16px]">Clients</h1></div>

                <div className="w-[300px]"><h1>Company</h1></div>

                <div className="w-[200px] mr-[25px]"><h1 className="">Last Modified</h1></div>

                <div className="w-[300px]"/>

            </div>

        {/* list of clients */}

            {clients.map((client) => (
                <Clientbox key={client.id} clientId={client.id} clientName={client.name} email={client.email} companyName={client.companyName} clientType={client.clientType} profilePicture={client.profilePicture} onEdit={() => onEdit?.(client)} onInvoice={() => setInvoiceClient(client)} />
            ))}
            {invoiceClient && <InvoiceModal client={invoiceClient} onClose={() => setInvoiceClient(null)} />}
            {searching && !clients.length && <p role="status" className="px-[40px] py-5 text-text-muted">No matching clients.</p>}

        </div>
        
        

        
    )
}
