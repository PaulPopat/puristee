import { DeepPartial, State } from "./deps.ts";
import * as Jsx from "./jsx.ts";

export type ReadonlyRecord<TKey extends string | number | symbol, TData> = {
  readonly [TK in TKey]: TData;
};

export type Request = {
  readonly url: string;
  readonly method: string;
  readonly parameters: ReadonlyRecord<string, string | Iterable<string>>;
  readonly headers: ReadonlyRecord<string, string>;
  readonly body: unknown;
};

export type Response = {
  readonly status: number;
  readonly headers?: ReadonlyRecord<string, string>;
} & ({ readonly body?: unknown } | { readonly jsx: Jsx.Node });

export type ServerResponse<TState extends State> = {
  state?: DeepPartial<TState>;
  response: Response;
};
