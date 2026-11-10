import { useState } from "react";
import type { ReactNode } from "react";
import { FiUpload, FiColumns } from "react-icons/fi";
import { TbLayoutBoardSplit } from "react-icons/tb";
import icon0 from "../../icons/cursor.png";
import icon1 from "../../icons/square.png";
import icon2 from "../../icons/circle.png";
import icon4 from "../../icons/slash.png";
import icon8 from "../../icons/trash.png";

export type WorkspaceTool = 0 | 1 | 2 | 3 | 4;

interface ToolBarProps {
  selectedTool?: WorkspaceTool;
  onToolChange?: (tool: WorkspaceTool) => void;
  onDeleteClick?: () => void;
  disabled?: boolean;
  canDelete?: boolean;
  onNewCardClick?: () => void;
  onUploadMediaClick?: () => void;
}

interface ToolButtonProps {
  label: string;
  icon: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  flipped?: boolean;
  onClick?: () => void;
}

function ToolButton({ label, icon, selected, disabled, flipped, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-primary bg-primary text-text-primary"
          : "border-transparent bg-transparent text-button-text enabled:hover:border-button-border enabled:hover:bg-button-bg enabled:active:border-primary enabled:active:bg-primary"
      }`}
    >
      {typeof icon === "string" ? <span
        aria-hidden="true"
        className={`block h-6 w-6 bg-current ${flipped ? "scale-x-[-1]" : ""}`}
        style={{ mask: `url("${icon}") center / contain no-repeat`, WebkitMask: `url("${icon}") center / contain no-repeat` }}
      /> : <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center">{icon}</span>}
    </button>
  );
}

export function ToolBar({ selectedTool: controlledTool, onToolChange, onDeleteClick, disabled = false, canDelete = true, onNewCardClick, onUploadMediaClick }: ToolBarProps = {}) {
  const [internalTool, setInternalTool] = useState<WorkspaceTool>(0);
  const selectedTool = controlledTool ?? internalTool;
  const setSelectedTool = (tool: WorkspaceTool) => { setInternalTool(tool); onToolChange?.(tool); };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div role="toolbar" aria-label="Workspace tools" className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-border bg-surface p-1.5 shadow-lg">
        <ToolButton label="Cursor" icon={icon0} flipped selected={selectedTool === 0} disabled={disabled} onClick={() => setSelectedTool(0)} />
        <ToolButton label="Rectangle" icon={icon1} flipped selected={selectedTool === 1} disabled={disabled} onClick={() => setSelectedTool(1)} />
        <ToolButton label="Ellipse" icon={icon2} flipped selected={selectedTool === 2} disabled={disabled} onClick={() => setSelectedTool(2)} />
        <ToolButton label="Line" icon={icon4} selected={selectedTool === 4} disabled={disabled} onClick={() => setSelectedTool(4)} />
        <div aria-hidden="true" className="mx-1 h-6 shrink-0 border-l border-border" />
        <ToolButton label="Section" icon={<FiColumns size={24} />} selected={selectedTool === 3} disabled={disabled} onClick={() => setSelectedTool(3)} />
        <ToolButton label="New card" icon={<TbLayoutBoardSplit size={24} />} disabled={disabled} onClick={onNewCardClick} />
        <ToolButton label="Upload media" icon={<FiUpload size={24} />} disabled={disabled} onClick={onUploadMediaClick} />
        <div aria-hidden="true" className="mx-1 h-6 shrink-0 border-l border-border" />
        <ToolButton label="Delete" icon={icon8} disabled={disabled || !canDelete} onClick={onDeleteClick} />
      </div>
    </div>
  );
}
