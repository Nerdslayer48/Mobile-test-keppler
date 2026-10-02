import { navigate } from "../../navigation";
import arrowRight from "../../icons/arrow-right.png";
import { Button } from "../00_UiComps/Button"


interface ProjectInfoProps {
  open?: boolean;
  clientName?: string;
  projectName?: string;
  onBack?: () => void;
}

export function ProjectInfo({
  open = true,
  clientName = "Client Name",
  projectName = "Project Name",
  onBack = () => navigate("/"),
}: ProjectInfoProps) {
  if (!open) return null;

  return (
    <div role="dialog" aria-label="Project information" className="pointer-events-none fixed inset-0 z-50 flex px-[24px] py-[32px]">

        <div className="pointer-events-auto py-[8px] px-[10px] bg-surface border-1 border-border flex flex-row items-center h-fit w-fit rounded-[12px] gap-[10px]">

        <Button className="p-[6px]! shrink-0" onClick={onBack} aria-label="Back to projects" title="Back to projects">
            <div>
              <span
                aria-hidden="true"
                className="block h-[20px] w-[20px] scale-[-1] bg-white"
                style={{
                  mask: `url("${arrowRight}") center / contain no-repeat`,
                  WebkitMask: `url("${arrowRight}") center / contain no-repeat`,
                }}
              />
            </div>

            </Button>
            

            <h1 className="font-montserrat text-text-primary font-semibold text-[20px]">{clientName}:</h1>
            <h1 className="font-inder text-text-secondary text-[20px]">{projectName}</h1>


        </div>


    </div>
  );
}
