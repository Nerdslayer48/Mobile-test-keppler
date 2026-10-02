import type { HTMLAttributes } from "react";
import { getProjectCategoryIcon } from "../../types/projectCategoryIcons";

export type ProjectTabsVariant = "one" | "two" | "three" | "multiple";

export interface ProjectTabsProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ProjectTabsVariant;
  title?: string;
  remainingCount?: number;
  categories?: string[];
}

const variants: Record<ProjectTabsVariant, { title: string; panels: string[] }> = {
  one: {
    title: "1 tab Example",
    panels: ["col-span-8 row-span-2"],
  },
  two: {
    title: "2 tabs Example",
    panels: ["col-span-8", "col-span-8"],
  },
  three: {
    title: "3 tabs Example",
    panels: ["col-span-3", "col-span-5", "col-span-8"],
  },
  multiple: {
    title: "Tabs above 3 Example",
    panels: ["col-span-3", "col-span-5", "col-span-5"],
  },
};

export function ProjectTabs({
  variant = "one",
  title,
  remainingCount = 2,
  categories,
  className = "",
  children,
  ...props
}: ProjectTabsProps) {
  const layout = variants[variant];

  return (
    <div
      className={`bg-accent w-[255px] h-fit rounded-[16px] p-[10px] ${className}`}
      {...props}
    >
      <h4 className="font-inder text-black/50 text-[12px] mb-[5px] truncate" title={title}>
        {title ?? layout.title}
      </h4>
      <div className="h-[140px] w-full bg-text-primary rounded-[6px] grid grid-cols-8 grid-rows-2 gap-[5px] p-[5px]">
        {layout.panels.map((panelClass, index) => {
          const category = categories?.[index];
          const icon = getProjectCategoryIcon(category);
          const iconSize = variant === "one" ? 72
            : variant === "two" ? 36
            : variant === "three" && index < 2 ? 24
            : 28;

          return (
          <div
            key={index}
            className={`bg-white flex items-center justify-center rounded-[3px] ${panelClass}`}
          >
            <span
              role="img"
              className="shrink-0 bg-primary opacity-50"
              aria-label={category || "Project"}
              title={category || "Project"}
              style={{
                width: iconSize,
                height: iconSize,
                mask: `url("${icon}") center / contain no-repeat`,
                WebkitMask: `url("${icon}") center / contain no-repeat`,
              }}
            />
          </div>
          );
        })}
        {variant === "multiple" && (
          <div className="col-span-3 bg-white flex items-center justify-center rounded-[3px]">
            <span className="font-montserrat text-[20px] opacity-50">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
