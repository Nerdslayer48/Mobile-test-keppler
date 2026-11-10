import { navigate } from "../../navigation";

import { Button } from "../00_UiComps/Button";
import { format } from "date-fns";
import { FiBriefcase, FiUser } from "react-icons/fi";
import type { ClientInput } from "../../types/client";



export function Clientbox ({ clientName = "", email = "", companyName = "", clientType = "individual", profilePicture, clientId, onEdit, onInvoice }: { clientId?: string; clientName?: string; email?: string; companyName?: string; clientType?: ClientInput["clientType"]; profilePicture?: string; onInvoice?: () => void; onEdit?: () => void }) {
    const DefaultIcon = clientType === "company" ? FiBriefcase : FiUser;
    const openProjects = () => {
        if (clientId) navigate(`/project?clientId=${encodeURIComponent(clientId)}`);
    };
    const displayCompanyName = companyName.trim();
    return(
        <div
            className={`flex w-full py-5 pl-[30px] pr-[110px] hover:bg-border ${clientId ? "cursor-pointer" : ""}`}
            role={clientId ? "link" : undefined}
            tabIndex={clientId ? 0 : undefined}
            aria-label={clientId ? `Open projects for ${clientName}` : undefined}
            onClick={openProjects}
            onKeyDown={(event) => {
                if (event.target === event.currentTarget && event.key === "Enter") openProjects();
            }}
        >
            <div className="flex w-full text-text-primary ">
                <div className="flex min-w-[300px] flex-1">
                <div className="flex flex-row ml-[10px]">

                    {/* display picture  */}
                    <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-button-border bg-button-bg text-button-text">
                        {profilePicture
                            ? <img src={profilePicture} alt={`${clientName || "Client"} profile`} className="h-full w-full object-cover" />
                            : <DefaultIcon size={24} aria-hidden="true" />}
                    </div>

                    {/* name of client and category */}

                            <div className="flex flex-col mx-[14px]">
                                <h1
                                className="text-[16px] font-montserrat font-semibold">{clientName || "Client Name"}</h1>

                                <h3 className="text-[14px] font-inder text-text-muted">{email}</h3>
                            </div>                        
                        
                </div>
                </div>
                <div className="flex w-[300px] shrink-0 flex-row">
                    <h1 className={displayCompanyName ? "font-montserrat text-text-primary font-semibold text-[16px]" : "text-[16px] text-text-tertiary font-inder"}>
                        {displayCompanyName || "---"}
                    </h1>
                </div>
                <div className="mr-[25px] w-[200px] shrink-0 text-text-tertiary font-inder">
                    {format(new Date(), "MMM d, yyyy")}
                </div>
                <div className="flex w-[300px] shrink-0 flex-row items-start" onClick={(event) => event.stopPropagation()}>
                    <Button variant="primary" className="mr-[10px]" onClick={onInvoice}> Invoice</Button>
                    <Button variant="secondary" onClick={onEdit}>
                        Edit
                    </Button>
                </div>

            </div>
        </div>
    )
}
