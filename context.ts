// deno-lint-ignore-file no-explicit-any
import { Readify, State } from "@fs_db";
import { ServerContext, StatedContext } from "./types.ts";

export default function ApplyContext<
  TState extends State,
  TContext extends ServerContext<TState>
>(state: Readify<TState>, context: TContext): StatedContext<TState, TContext> {
  const result: any = {};
  for (const key in context)
    result[key] = (...args: any[]) => context[key](state, ...args);
  return result;
}
