import { useUndoState } from "../../hooks/useUndoState";
import { useState } from "react";
import { CardNodes } from "../00_UiComps/CardNodes";
import { CardInputBox } from "../00_UiComps/CardInputBox";
import { FiPlus } from "react-icons/fi";
import type { CardInput } from "../../types/workspaceStorage";

export function Card() {
  const { value: draft, set: setDraft, undo, redo } = useUndoState<{ text: string; inputs: CardInput[] }>(() => ({ text: "", inputs: [{ id: crypto.randomUUID(), text: "" }] }));
  const { text, inputs } = draft;
  const setText = (text: string) => setDraft(current => ({ ...current, text }));
  const setInputs = (update: (inputs: CardInput[]) => CardInput[]) => setDraft(current => ({ ...current, inputs: update(current.inputs) }));
  const [selectedInput, setSelectedInput] = useState<string | null>(null);

  return (
    <div onKeyDownCapture={event => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === "z" || key === "y")) {
        event.preventDefault(); event.stopPropagation();
        if (key === "y" || event.shiftKey) redo(); else undo();
      } else if (selectedInput && (key === "delete" || key === "backspace") && !(event.target as HTMLElement).closest("input, textarea")) {
        event.preventDefault(); setInputs(current => current.filter(input => input.id !== selectedInput)); setSelectedInput(null);
      }
    }} className="group/card relative bg-card w-[420px] h-fit pb-[20px] rounded-[8px] ring-primary border-1 border-border items-center">
      <CardNodes />
      <div className="flex justify-center py-[24px]">
        <input
          type="text"
          aria-label="Card title"
          value={text}
          onChange={(event) => setText(event.target.value)}
          style={{ width: `${Math.max(text.length, 1)}ch` }}
          className="max-w-full border-0 outline-none ring-0 font-bold text-text-primary font-montserrat text-[24px] text-center"
        />
      </div>
      <div className="mx-5 flex min-w-0 flex-col gap-2">
        {inputs.map((input, index) => <CardInputBox key={input.id} input={input} index={index}
          selected={selectedInput === input.id} first={index === 0} last={index === inputs.length - 1}
          onSelect={() => setSelectedInput(input.id)}
          onChange={box => setInputs(current => current.map(item => item.id === box.id ? box : item))}
          onReorder={offset => setInputs(current => {
            const next = [...current], position = next.findIndex(item => item.id === input.id), target = position + offset;
            if (position < 0 || target < 0 || target >= next.length) return current;
            [next[position], next[target]] = [next[target], next[position]];
            return next;
          })} />)}
        <button type="button" aria-label="Add input box" className="self-center rounded p-1 text-text-muted hover:bg-button-bg"
          onClick={() => setInputs(current => [...current, { id: crypto.randomUUID(), text: "" }])}><FiPlus size={14} /></button>
      </div>
    </div>
  );
}

export default Card;
