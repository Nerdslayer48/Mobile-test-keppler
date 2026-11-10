import type { ClientInput } from "../../types/client";
import type { ReactNode } from "react";
import { Input } from "../00_UiComps/Input";
import { Button } from "../00_UiComps/Button";
import { useState } from "react";
import { NewClient } from "../03_PopUps/NewClient";
import { currentRoute, navigate } from "../../navigation";
import { FiArrowLeft } from "react-icons/fi";

interface HeaderProps {
    children?: ReactNode;
    companyName: string;
    showClientActions?: boolean;
    onCreateClient?: (client: ClientInput) => void;
    search?: string;
    onSearchChange?: (value: string) => void;
}

export function Header({ companyName, showClientActions = true, onCreateClient, children, search = '', onSearchChange }: HeaderProps) {
    const [newClientOpen, setNewClientOpen] = useState(false);
    const pathname = currentRoute().pathname;

    return(
        <div className="pt-[32px] min-w-[1440px]">
            <div className="flex flex-row items-center gap-[16px] px-[50px]">
                {(pathname === '/settings' || pathname === '/staff') && <Button variant="secondary" className="!px-3" aria-label="Back to home" title="Back to home" onClick={() => navigate('/')}><FiArrowLeft size={20} /></Button>}
                <h1 className="font-montserrat font-bold text-text-primary text-[28px]
                mr-auto "><button type="button" onClick={() => navigate('/')} aria-label="Company home">{companyName}</button></h1>

                {pathname !== '/settings' && pathname !== '/staff' && <nav aria-label="Company navigation" className="flex gap-[10px]">
                    <Button variant="secondary" onClick={() => navigate('/staff')}>Staff</Button>
                    <Button variant="secondary" onClick={() => navigate('/settings')}>Settings</Button>
                </nav>}

                {children}
                {showClientActions && <>
                <Input type="search" name="search" id="search" aria-label="Search clients" placeholder="Search clients" value={search} onChange={event => onSearchChange?.(event.target.value)} />

                <Button
                    onClick={() => setNewClientOpen(true)}
                >
                    + New Client
                </Button>
                </>}

            </div>

            {newClientOpen && <NewClient
                open={newClientOpen}
                onClose={() => setNewClientOpen(false)}
                onSave={onCreateClient}
            />}
        </div>
    )
} 
