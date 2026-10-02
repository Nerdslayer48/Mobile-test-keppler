import { emptyClient } from "../../types/client";
import type { ClientInput } from "../../types/client";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { Button } from "../00_UiComps/Button";
import { Input } from "../00_UiComps/Input";

interface NewCompanyProps {
  open?: boolean;
  onClose?: () => void;
  onSave?: (client: ClientInput) => void;
  initialValues?: ClientInput;
  onDelete?: () => void;
  draft?: ClientInput;
  onDraftChange?: (client: ClientInput) => void;
  editing?: boolean;
  onSelectIndividual?: () => void;
}

export function NewCompany({ open, onClose, onSave, onSelectIndividual, initialValues, onDelete, draft: controlledDraft, onDraftChange, editing }: NewCompanyProps) {

  const [internalOpen, setInternalOpen] = useState(false);
  const [internalDraft, setInternalDraft] = useState<ClientInput>(() => ({ ...emptyClient, clientType: "company", ...initialValues }));
  const draft = controlledDraft ?? internalDraft;
  const setDraft = onDraftChange ?? setInternalDraft;
  const field = (key: keyof ClientInput) => ({
    value: draft[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: event.target.value }),
  });

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

      {modal && <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">

      <div>
        <div className="bg-background max-w-[670px] h-fit border-1 border-border-strong rounded-[16px] px-[24px] py-[32px]">
        <h1 className="font-semibold font-montserrat text-[32px] text-text-primary mb-[36px]">
          {editing ? "Edit Client" : "Create A New Client"}
        </h1>
        <div className="flex gap-[10px] mb-[20px]">
          <Button className="h-[27px]" variant="secondary" onClick={onSelectIndividual}>Individual</Button>
          <Button className="h-[27px]" >Company</Button>
          {editing && <Button className="h-[27px]" variant="delete" onClick={onDelete}>Delete</Button>}
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

            <div className="flex flex-row mb-[16px]">

                <div>
                  <div>
                    <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Address</h4>
                    <Input placeholder="123 Main Street" className="flex flex-row w-[612px]" {...field("address")}/>
                  </div>
                </div>
              </div>

              <div className="mb-[16px]">
                <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Email</h4>
                <Input type="email" placeholder="Stonks@company.com" className="w-[612px]" {...field("email")}/>
              </div>
              <div className="mb-[16px]">
                <h4 className=" text-text-secondary pb-[8px] pt-[16px]">Other Contact</h4>
                <Input placeholder="" className="w-[612px]" {...field("otherContact")}/>
              </div>

              

        <div className="flex justify-center mt-[32px]">
          <Button onClick={() => {
            onSave?.({ ...draft, clientType: "company", email: draft.email.trim(), companyName: draft.companyName.trim() });
            setDraft({ ...emptyClient });
            setNewClient();
          }}>{editing ? "Save Changes" : "Done"}</Button>
          {editing && <Button className="ml-[10px]" variant="secondary" onClick={setNewClient}>Cancel</Button>}
        </div>
        </div>
      </div>
      
      </div> 
      }

    </div>
  );
}


