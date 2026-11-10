import { useCallback, useReducer, useRef } from "react";
import type { SetStateAction } from "react";

interface History<T> { present: T; past: T[]; future: T[]; group?: number }
type Action<T> = { type: "set"; value: SetStateAction<T>; group?: number } | { type: "reset"; value: T } | { type: "undo" | "redo" };
export function historyReducer<T>(state: History<T>, action: Action<T>): History<T> {
  if (action.type === "reset") return { present: action.value, past: [], future: [] };
  if (action.type === "undo") {
    if (!state.past.length) return state;
    return { present: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.present, ...state.future] };
  }
  if (action.type === "redo") {
    if (!state.future.length) return state;
    return { present: state.future[0], past: [...state.past, state.present], future: state.future.slice(1) };
  }
  if (action.type !== "set") return state;
  const present = typeof action.value === "function" ? (action.value as (value: T) => T)(state.present) : action.value;
  if (Object.is(present, state.present)) return state;
  return { present, past: action.group !== undefined && action.group === state.group ? state.past : [...state.past.slice(-99), state.present], future: [], group: action.group };
}

export function useUndoState<T>(initial: T | (() => T)) {
  const [history, dispatch] = useReducer(historyReducer<T>, initial, value => ({ present: typeof value === "function" ? (value as () => T)() : value, past: [], future: [] }));
  const group = useRef<number | undefined>(undefined);
  const nextGroup = useRef(0);
  const set = useCallback((value: SetStateAction<T>) => dispatch({ type: "set", value, group: group.current }), []);
  const reset = useCallback((value: T) => dispatch({ type: "reset", value }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const begin = useCallback(() => { group.current = ++nextGroup.current; }, []);
  const end = useCallback(() => { group.current = undefined; }, []);
  return { value: history.present, set, reset, undo, redo, begin, end };
}
