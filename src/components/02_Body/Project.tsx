import plusIcon from "../../icons/plus.png";
import { currentRoute, navigate } from "../../navigation";
import { Input } from "../00_UiComps/Input";
import { Button } from "../00_UiComps/Button";
import { useState } from "react";
import { loadClients } from "../../types/clientStorage";
import { ProjectTabs } from "../00_UiComps/ProjectTabs";
import { NewProject } from "../03_PopUps/NewProject";
import { loadProjects, projectVariant, saveProject } from "../../types/project";
import { ProjectWorkspace } from "./ProjectWorkspace";
import backArrow from "../../icons/arrow-right.png";

function BackButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="Back to clients"
      title="Back to clients"
      onClick={() => navigate('/')}
      className={`inline-flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] hover:bg-button-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-[24px] w-[24px] rotate-180 bg-text-primary"
        style={{
          mask: `url("${backArrow}") center / contain no-repeat`,
          WebkitMask: `url("${backArrow}") center / contain no-repeat`,
        }}
      />
    </button>
  );
}

export function Project() {
  const clientId = currentRoute().searchParams.get("clientId");
  const [client] = useState(() => loadClients().find((savedClient) => savedClient.id === clientId));
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projects, setProjects] = useState(() => clientId ? loadProjects(clientId) : []);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  if (!client) {
    return (
      <div className="p-[50px] text-text-primary">
        <BackButton />
        <h1 className="mt-6 text-[28px] font-montserrat">Client not found</h1>
        <p>Select a client from the homepage to view their projects.</p>
      </div>
    );
  }

  const activeProject = projects.find((project) => project.id === activeProjectId);
  if (activeProject) {
    return <ProjectWorkspace key={activeProject.id} clientId={client.id} projectId={activeProject.id}
      clientName={client.name} projectName={activeProject.name} onBack={() => setActiveProjectId(null)} />;
  }

  return (
    <div className="min-w-[1440px] pt-[32px] px-[50px]">
        <div className=" flex mb-[21px]">
            <div className="flex mr-auto items-center">
                <BackButton className="mr-[20px]" />
                <h1 className="font-semibold font-montserrat text-[28px] text-text-primary"> Client: </h1>
                <h2 className=" font-montserrat text-text-primary pl-2 text-[28px] font-medium">{client.name}</h2>
            </div>

            <div>
                <Input></Input>
                <Button className=" flex ml-[25px]">+ New Invoice</Button>
            </div>
        </div>

        <h2 className="text-text-primary font-semibold font-montserrat text-[16px]  mb-[6px]">
            Projects
        </h2>

        <h3 className="text-text-tertiary font-inder text-[16px] mb-[26px]">
            Manage and oversee client projects from planning through successful completion.
        </h3>

        <div className="bg-surface min-w-[1340px] h-screen border-1 border-b-0 border-border rounded-tl-[16px] rounded-tr-[16px] pt-[40px] px-[24px] ">
            <div className="grid grid-cols-4 justify-items-center gap-y-[46px]">
            
            <button type="button" onClick={() => setNewProjectOpen(true)} className="bg-accent w-[255px] h-[180px] rounded-[16px] p-[10px] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="block font-inder text-black/50 text-[12px] mb-[5px]">New Project</span>
                
                <span className="h-[140px] w-full bg-text-primary rounded-[6px] flex flex-col items-center justify-center">
                    <img className=" w-[16px] h-[16px] opacity-50 mb-[12px]" src={plusIcon} alt="" />
                    <span className="font-inder text-background/50">Create new</span>
                    <span className="font-inder text-background/50">Project</span>
                </span>

            </button>
            

                {projects.map((project) => (
                    <ProjectTabs
                        key={project.id}
                        title={project.name}
                        variant={projectVariant(project.categories.length)}
                        remainingCount={Math.max(0, project.categories.length - 3)}
                        categories={project.categories}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${project.name} mood board`}
                        className="cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
                        onClick={() => setActiveProjectId(project.id)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setActiveProjectId(project.id);
                            }
                        }}
                    />
                ))}
                

            </div>
        </div>

        {newProjectOpen && (
            <NewProject
                onClose={() => setNewProjectOpen(false)}
                onCreate={(input) => {
                    const saved = saveProject({ ...input, id: crypto.randomUUID(), clientId: client.id });
                    setProjects(saved);
                }}
            />
        )}
    </div>
  );
}
