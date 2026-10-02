import { emptyClient } from "../../types/client";
import type { ClientInput } from "../../types/client";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { Button } from "../00_UiComps/Button";
import { Input } from "../00_UiComps/Input";
import { NewCompany } from "./NewCompany";

interface NewClientProps {
  open?: boolean;
  onClose?: () => void;
  onSave?: (client: ClientInput) => void;
  initialValues?: ClientInput;
  onDelete?: () => void;
}

export function NewClient({ open, onClose, onSave, initialValues, onDelete }: NewClientProps) {

  const [internalOpen, setInternalOpen] = useState(false);
  const [internalDraft, setInternalDraft] = useState<ClientInput>(() => ({ ...emptyClient, ...initialValues }));
  const draft = internalDraft;
  const setDraft = setInternalDraft;
  const field = (key: keyof ClientInput) => ({
    value: draft[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: event.target.value }),
  });
  const { clientType } = draft;
  const setClientType = (clientType: ClientInput["clientType"]) => setDraft({ ...draft, clientType });

  const isControlled = open !== undefined;
  const modal = open ?? internalOpen;


  const setNewClient = () => {
    if (isControlled) {
      onClose?.();
      return;
    }

    setInternalOpen(!modal);
  };

  return (
    <div className="">
      {!isControlled && (
        <button className="btn-modal" onClick={setNewClient}>
          open
        </button>
      )}

      <NewCompany
        open={modal && clientType === "company"}
        onClose={setNewClient}
        onSave={onSave}
        draft={draft}
        onDraftChange={setDraft}
        editing={!!initialValues}
        onDelete={onDelete}
        onSelectIndividual={() => setClientType("individual")}
      />

      {modal && clientType === "individual" && <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">

      <div>
        <div className="bg-background max-w-[670px] h-fit max-h-[min(830px,calc(100dvh-32px))] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-1 border-border-strong rounded-[16px] px-[24px] py-[32px]">
        <h1 className="font-semibold font-montserrat text-[32px] text-text-primary mb-[36px]">
          {initialValues ? "Edit Client" : "Create A New Client"}
        </h1>
        <div className="flex gap-[10px] mb-[20px]">
          <Button
            className="h-[27px]"
            variant="primary"
            onClick={() => setClientType("individual")}
          >Individual</Button>
          <Button
            className="h-[27px]"
            variant="secondary"
            onClick={() => setClientType("company")}
          >Company</Button>
          {initialValues && <Button className="h-[27px]" variant="delete" onClick={onDelete}>Delete</Button>}
        </div>
          <div className="flex flex-row gap-[38px] mb-[16px]">
            <div>
              <h3 className="text-text-primary text-[20px] font-medium font-montserrat">Client Information</h3>
              <h4 className=" text-text-secondary pb-[8px] pt-[16px]">First name</h4>
              <Input placeholder="John" className="w-[360px]" {...field("firstName")}/>

              <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Last name</h4>
              <Input placeholder="Doe" className="w-[360px]" {...field("lastName")}/>
            
            
            </div>

            <div>
              <div className="bg-button-bg w-[210px] h-[210px] rounded-[6px] border-1 border-button-border">
              </div>

            </div>
          
          </div>

            <div className="flex flex-row mb-[16px]">
                <div className="mr-[24px]">
                  <h4  className=" text-text-secondary pb-[8px] pt-[16px]">Phone number</h4>
                  <Input placeholder="080 - xx - xxx- xxx" className= "w-[100px]" {...field("phone")}/>
                </div>

                <div>
                  <div>
                    <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Address</h4>
                    <Input placeholder="123 Main Street" className="flex flex-row w-[350px]" {...field("address")}/>
                  </div>
                </div>
              </div>

              <div className="mb-[16px]">
                <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Email</h4>
                <Input type="email" placeholder="JohnDoe1961@gmail.com" className="w-[612px]" {...field("email")}/>
              </div>
              <div className="mb-[16px]">
                <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Other Contact</h4>
                <Input placeholder="" className="w-[612px]" {...field("otherContact")}/>
              </div>

              <div>
                <h3 className="text-text-primary text-[20px] font-medium font-montserrat">Organization</h3>
                <div>
                  <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Company Name</h4>
                  <Input placeholder="Stonks international" className="w-[612px]" {...field("companyName")}/>
                </div>
                <div>
                  <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Company Address</h4>
                  <Input placeholder="123 Business Street" className="w-[612px]" {...field("companyAddress")}/>
                </div>
                <div>
                  <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Hotline</h4>
                  <Input placeholder="Business Hotline" className="w-[612px]" {...field("hotline")}/>
                </div>
              </div>

        <div className="flex justify-center mt-[32px]">
          <Button onClick={() => {
            onSave?.({ ...draft, email: draft.email.trim(), companyName: draft.companyName.trim() });
            setDraft({ ...emptyClient });
            setNewClient();
          }}>{initialValues ? "Save Changes" : "Done"}</Button>
          {initialValues && <Button className="ml-[10px]" variant="secondary" onClick={setNewClient}>Cancel</Button>}
        </div>
        </div>
      </div>
      
      </div> 
      }

    </div>
  );
}
