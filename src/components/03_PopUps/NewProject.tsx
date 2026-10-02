import { useState } from "react";
import { Button } from "../00_UiComps/Button";
import { Input } from "../00_UiComps/Input";
import { getProjectCategoryIcon } from "../../types/projectCategoryIcons";
import type { ProjectInput } from "../../types/project";
import dropdownArrow from "../../icons/arrow-right.png";

const projectOptions = [
  "Graphic Design/Illustration", "Web/Software Development", "UI/UX Design",
  "Social Media Management", "Video Editing/VFX", "Motion Graphics/Animation",
  "3D Design", "Photography", "Audio & Sound Design", "AI Automation",
  "Digital Marketing", "Product Design", "Data Visualization", "Architectural Visualization",
  "Game Development",
];

function CategoryIcon({ category }: { category: string }) {
  const mask = `url("${getProjectCategoryIcon(category)}") center / contain no-repeat`;

  return (
    <span
      aria-hidden="true"
      className="h-[20px] w-[20px] shrink-0 bg-primary opacity-50"
      style={{ mask, WebkitMask: mask }}
    />
  );
}

interface NewProjectProps {
  onCreate?: (project: ProjectInput) => void;
  onClose?: () => void;
}

export function NewProject({ onCreate, onClose }: NewProjectProps) {
  const [saveError, setSaveError] = useState("");
  const [projectName, setProjectName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryError, setCategoryError] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(-1);
  const filteredOptions = projectOptions.filter((option) =>
    option.toLowerCase().includes(category.trim().toLowerCase()) && !categories.includes(option)
  );

  const addCategory = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setCategories((current) => current.includes(value) ? current : [...current, value]);
    setCategory("");
    setCategoryError(false);
    setOptionsOpen(false);
    setActiveOption(-1);
  };

  return (
    <div>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25">
            <div className="bg-background border-border-strong border-1 w-[670px] h-fit px-[24px] py-[32px] rounded-[16px] ">

                <h1 className="font-montserrat font-semibold text-text-primary text-[32px] mb-[32px]">Create a New Project</h1>

                <label htmlFor="project-name" className="block text-[14px] font-montserrat font-medium text-text-secondary mb-[16px]">Project Name</label>
                <Input
                    id="project-name"
                    placeholder="e.g Untitled Project"
                    className="w-[608px]"
                    value={projectName}
                    onChange={(event) => {
                        setProjectName(event.target.value);
                        if (event.target.value.trim().length >= 4) setNameError(false);
                    }}
                    aria-invalid={nameError}
                    aria-describedby={nameError ? "project-name-error" : undefined}
                />
                {nameError && (
                    <p id="project-name-error" role="alert" className="mt-[8px] text-[14px] text-error">
                        Project name must be atleast 4 characters long
                    </p>
                )}
                <label htmlFor="add-project" className="block text-[14px] font-montserrat font-medium text-text-secondary my-[16px]">Add Project</label>
                <div
                    className="relative w-[608px]"
                    onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                            setOptionsOpen(false);
                            setActiveOption(-1);
                        }
                    }}
                >
                <Input
                    id="add-project"
                    name="project"
                    role="combobox"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={optionsOpen}
                    aria-controls="project-categories"
                    aria-activedescendant={optionsOpen && activeOption >= 0 ? `project-option-${activeOption}` : undefined}
                    onFocus={() => setOptionsOpen(true)}
                    value={category}
                    aria-invalid={categoryError}
                    aria-describedby={categoryError ? "project-category-error" : undefined}
                    onChange={(event) => {
                        setCategory(event.currentTarget.value);
                        setOptionsOpen(true);
                        setActiveOption(-1);
                    }}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                            event.preventDefault();
                            setOptionsOpen(true);
                            const next = event.key === "ArrowDown"
                                ? Math.min(activeOption + 1, filteredOptions.length - 1)
                                : Math.max(activeOption - 1, 0);
                            setActiveOption(filteredOptions.length ? next : -1);
                            requestAnimationFrame(() => document.getElementById(`project-option-${next}`)?.scrollIntoView({ block: "nearest" }));
                        } else if (event.key === "Escape") {
                            setOptionsOpen(false);
                            setActiveOption(-1);
                        } else if (event.key === "Enter") {
                            event.preventDefault();
                            addCategory(optionsOpen && activeOption >= 0
                                ? filteredOptions[activeOption]
                                : event.currentTarget.value);
                        }
                    }}
                    placeholder="Select or type a project category"
                    className="h-[40px] w-[608px] rounded-[10px] border border-input-border bg-input-bg pl-[20px] pr-[48px] font-inder text-input-text"
                />
                <button
                    type="button"
                    aria-label={optionsOpen ? "Hide project categories" : "Show project categories"}
                    aria-expanded={optionsOpen}
                    aria-controls="project-categories"
                    aria-haspopup="listbox"
                    className="absolute right-[4px] top-[4px] flex h-[32px] w-[36px] cursor-pointer items-center justify-center rounded-[6px] hover:bg-button-hover focus-visible:outline-2 focus-visible:outline-primary"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        const nextOpen = !optionsOpen;
                        document.getElementById("add-project")?.focus();
                        setOptionsOpen(nextOpen);
                        setActiveOption(-1);
                    }}
                >
                    <span
                        aria-hidden="true"
                        className={`h-[14px] w-[14px] bg-primary opacity-50 transition-transform ${optionsOpen ? "-rotate-90" : "rotate-90"}`}
                        style={{
                            mask: `url("${dropdownArrow}") center / contain no-repeat`,
                            WebkitMask: `url("${dropdownArrow}") center / contain no-repeat`,
                        }}
                    />
                </button>
                {optionsOpen && (
                    <div className="absolute top-full z-10 mt-[4px] w-full rounded-[10px] border border-input-border bg-input-bg shadow-lg">
                        <ul id="project-categories" role="listbox" aria-label="Project categories" className="max-h-[200px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {filteredOptions.map((option, index) => (
                                <li
                                    key={option}
                                    id={`project-option-${index}`}
                                    role="option"
                                    aria-selected={activeOption === index}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => addCategory(option)}
                                    className={`flex items-center gap-[10px] cursor-pointer px-[20px] py-[8px] text-input-text hover:bg-button-hover ${activeOption === index ? "bg-button-hover" : ""}`}
                                >
                                    <CategoryIcon category={option} />
                                    <span className="min-w-0 [overflow-wrap:anywhere]">{option}</span>
                                </li>
                            ))}
                        </ul>
                        {filteredOptions.length === 0 && (
                            <p role="status" className="px-[20px] py-[8px] text-text-secondary">No matches. Press Enter to add your own.</p>
                        )}
                    </div>
                )}
                </div>

                <div>
                    <div className="bg-input-bg w-[608px] h-fit p-[8px] border-1 border-border mt-[16px] min-h-[64px] rounded-[8px] flex flex-wrap items-center gap-[8px]">
                        {categories.map((value) => (
                            <Button
                                key={value}
                                variant="secondary"
                                className="max-w-full gap-[8px] whitespace-normal [overflow-wrap:anywhere]"
                                aria-label={`Remove ${value}`}
                                onClick={() => setCategories((current) => current.filter((category) => category !== value))}
                            >
                                <CategoryIcon category={value} />
                                <span className="min-w-0">{value}</span>
                            </Button>
                        ))}
                    </div>
                    {categoryError && (
                        <p id="project-category-error" role="alert" className="mt-[8px] text-[14px] text-error">
                            Select atleast one project
                        </p>
                    )}
                </div>


                <div className="flex justify-center mt-[32px]">
                    {onClose && <Button variant="secondary" className="mr-[10px]" onClick={onClose}>Cancel</Button>}
                    <Button variant="primary" onClick={() => {
                        setNameError(projectName.trim().length < 4);
                        setCategoryError(categories.length === 0);
                        if (projectName.trim().length < 4 || categories.length === 0) return;
                        setSaveError("");
                        try {
                            onCreate?.({ name: projectName.trim(), categories: [...categories] });
                            onClose?.();
                        } catch {
                            setSaveError("Unable to save the project. Please try again.");
                        }
                    }}>Create Project</Button>
                </div>
                {saveError && <p role="alert" className="mt-[8px] text-[14px] text-error">{saveError}</p>}

            </div>
        
        </div>
    </div>
  );
}

export { NewProject as Newproject };

