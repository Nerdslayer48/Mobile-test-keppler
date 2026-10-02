import type { ClientInput } from "../../types/client";
import { Input } from "../00_UiComps/Input";
import { Button } from "../00_UiComps/Button";
import { useState } from "react";
import { NewClient } from "../03_PopUps/NewClient";

interface HeaderProps {
    onCreateClient?: (client: ClientInput) => void;
}

export function Header({ onCreateClient }: HeaderProps) {
    const [newClientOpen, setNewClientOpen] = useState(false);

    return(
        <div className="pt-[32px] min-w-[1440px]">
            <div className="flex flex-row ">
                <h1 className="font-montserrat font-bold text-text-primary text-[28px]
                ml-[50px] mr-auto ">Clients</h1>


                <Input type="search" name="search" id="search" placeholder="Search clients" />

                <Button
                    className="mr-[50px] ml-[25px]"
                    onClick={() => setNewClientOpen(true)}
                >
                    + New Client
                </Button>

            </div>

            {newClientOpen && <NewClient
                open={newClientOpen}
                onClose={() => setNewClientOpen(false)}
                onSave={onCreateClient}
            />}
        </div>
    )
} 
