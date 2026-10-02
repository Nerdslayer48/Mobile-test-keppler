import { useState } from "react";
import icon0 from "../../icons/cursor.png"; 
import icon1 from "../../icons/square.png";
import icon2 from "../../icons/circle.png";
import icon4 from "../../icons/slash.png";
import icon5 from "../../icons/text-box-edit.png"; 
import icon6 from "../../icons/picture.png";
import icon7 from "../../icons/play-alt.png";
import icon8 from "../../icons/trash.png"; 
import { Button } from "../00_UiComps/Button"


export type WorkspaceTool = 0 | 1 | 2 | 4;

interface ToolBarProps {
  selectedTool?: WorkspaceTool;
  onToolChange?: (tool: WorkspaceTool) => void;
  onDeleteClick?: () => void;
  disabled?: boolean;
  canDelete?: boolean;
  onTextClick?: () => void;
  onImageClick?: () => void;
  onVideoClick?: () => void;
}

export function ToolBar({ selectedTool: controlledTool, onToolChange, onDeleteClick, disabled = false, canDelete = true, onTextClick, onImageClick, onVideoClick }: ToolBarProps = {}) {
  const [internalTool, setInternalTool] = useState<WorkspaceTool>(0);
  const selectedTool = controlledTool ?? internalTool;
  const setSelectedTool = (tool: WorkspaceTool) => { setInternalTool(tool); onToolChange?.(tool); };
  return (
    <div role="dialog" aria-label="Tool Bar" className="pointer-events-none fixed inset-0 z-50 flex mr-[24px] flex items-center justify-end">

       <div className="pointer-events-auto bg-surface border-1 border-border flex flex-col p-[8px] rounded-[16px]">
        <Button disabled={disabled} disableHover type="button" variant={selectedTool === 0 ? "primary" : "secondary"} onClick={() => setSelectedTool(0)} aria-pressed={selectedTool === 0} aria-label="Cursor" className="w-fit mb-[8px]"> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px] scale-x-[-1]" style={{ mask: `url("${icon0}") center / contain no-repeat`, WebkitMask: `url("${icon0}") center / contain no-repeat` }} /></Button>
        <Button disabled={disabled} disableHover type="button" variant={selectedTool === 1 ? "primary" : "secondary"} onClick={() => setSelectedTool(1)} aria-pressed={selectedTool === 1} aria-label="Rectangle" className="w-fit mb-[8px]"> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px] scale-x-[-1]" style={{ mask: `url("${icon1}") center / contain no-repeat`, WebkitMask: `url("${icon1}") center / contain no-repeat` }} /></Button>
        <Button disabled={disabled} disableHover type="button" variant={selectedTool === 2 ? "primary" : "secondary"} onClick={() => setSelectedTool(2)} aria-pressed={selectedTool === 2} aria-label="Ellipse" className="w-fit mb-[8px]"> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px] scale-x-[-1]" style={{ mask: `url("${icon2}") center / contain no-repeat`, WebkitMask: `url("${icon2}") center / contain no-repeat` }} /></Button>
        <Button disabled={disabled} disableHover type="button" variant={selectedTool === 4 ? "primary" : "secondary"} onClick={() => setSelectedTool(4)} aria-pressed={selectedTool === 4} aria-label="Line" className="w-fit mb-[8px]"> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px]" style={{ mask: `url("${icon4}") center / contain no-repeat`, WebkitMask: `url("${icon4}") center / contain no-repeat` }} /></Button>

        <div className="border-t border-border mb-[8px]"> </div>

        <Button disabled={disabled} disableHover type="button" variant="secondary" onClick={onTextClick} aria-label="Text" className="w-fit mb-[8px] active:bg-primary active:border-primary active:text-text-primary"> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px]" style={{ mask: `url("${icon5}") center / contain no-repeat`, WebkitMask: `url("${icon5}") center / contain no-repeat` }} /></Button>
        <Button disabled={disabled} disableHover type="button" variant="secondary" onClick={onImageClick} aria-label="Image" className="w-fit mb-[8px] active:bg-primary active:border-primary active:text-text-primary"> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px]" style={{ mask: `url("${icon6}") center / contain no-repeat`, WebkitMask: `url("${icon6}") center / contain no-repeat` }} /></Button>
        <Button disabled={disabled} disableHover type="button" variant="secondary" onClick={onVideoClick} aria-label="Video" className="w-fit mb-[8px] active:bg-primary active:border-primary active:text-text-primary"> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px]" style={{ mask: `url("${icon7}") center / contain no-repeat`, WebkitMask: `url("${icon7}") center / contain no-repeat` }} /></Button>
        
        <div className="border-t border-border mb-[8px]"> </div>
        
        <Button disabled={disabled || !canDelete} disableHover type="button" variant="delete" onClick={onDeleteClick} aria-label="Delete" className="w-fit "> <span aria-hidden="true" className="block bg-text-primary h-[32px] w-[32px] m-[2px]" style={{ mask: `url("${icon8}") center / contain no-repeat`, WebkitMask: `url("${icon8}") center / contain no-repeat` }} /></Button>
        
        </div> 

       


    </div>
  );
}
