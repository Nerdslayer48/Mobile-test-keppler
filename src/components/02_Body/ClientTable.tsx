
import { Clientbox } from "./CLientBox";
import type { Client } from "../../types/client";

export function Clientlist({ clients = [], onEdit }: { clients?: Client[]; onEdit?: (client: Client) => void }){
    return(
        
        <div className="bg-surface h-screen mx-[50px] rounded-tl-[16px] rounded-tr-[16px] pr-[110px]
        pt-[20px] border-border border-1 border-b-0 flex flex-col
        min-w-[1340px] pl-[30px]">

        {/* items names */}

            <div className="flex flex-row text-[13px] font-montserrat font-semibold text-text-primary pb-5 ml-[10px]">
                <div className="min-w-[300px] flex flex-1"><h1 className=" max-h-[16px]">Clients</h1></div>

                <div className="w-[300px]"><h1>Company</h1></div>

                <div className="w-[200px] mr-[25px]"><h1 className="">Last Modified</h1></div>

                <div className="w-[300px]"/>

            </div>

        {/* list of clients */}

            {clients.map((client) => (
                <Clientbox key={client.id} clientId={client.id} clientName={client.name} email={client.email} companyName={client.companyName} onEdit={() => onEdit?.(client)} />
            ))}

        </div>
        
        

        
    )
}
