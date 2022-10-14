// deno-lint-ignore-file no-explicit-any
import { Readify, State, Writify } from "@fs_db";

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
  readonly headers: ReadonlyRecord<string, string>;
  readonly body: unknown;
};

export type RequestMiddleware<
  TRequest extends Request,
  TResponse extends Request,
  TState extends State,
  TContext extends ServerContext<TState>
> = (
  request: TRequest,
  state: Readify<TState>,
  context: StatedContext<TState, TContext>
) => Promise<TResponse> | TResponse;

export type StateProvider<
  TState extends State,
  TArgs extends Array<any>,
  TReturn
> = (state: Readify<TState>, ...args: TArgs) => Promise<TReturn> | TReturn;

type StatedProvider<TState extends State, T> = T extends StateProvider<
  TState,
  infer A,
  infer R
>
  ? (...args: A) => Promise<R> | R
  : never;

export type ServerContext<TState extends State> = Record<
  string,
  StateProvider<TState, Array<any>, any>
>;

type ContextWith<
  TState extends State,
  TContext extends ServerContext<TState>,
  TNextKey extends string,
  TProvider extends StateProvider<TState, Array<any>, any>
> = {
  [TKey in keyof TContext]: TContext[TKey];
} & {
  [TKey in TNextKey]: TProvider;
};

export type StatedContext<
  TState extends State,
  TContext extends ServerContext<TState>
> = {
  [TKey in keyof TContext]: StatedProvider<TState, TContext[TKey]>;
};

export type Handler<
  TState extends State,
  TRequest extends Request,
  TContext extends ServerContext<TState>
> = (
  request: TRequest,
  state: Readify<TState>,
  context: StatedContext<TState, TContext>
) =>
  | Promise<{ state: Writify<TState>; response: Response }>
  | { state: Writify<TState>; response: Response };

export type Server<
  TState extends State,
  TRequest extends Request,
  TContext extends ServerContext<TState>
> = {
  WithMiddleware<TResponse extends Request>(
    middleware: RequestMiddleware<TRequest, TResponse, TState, TContext>
  ): Server<TState, TResponse, TContext>;

  WithProvider<
    TProvider extends StateProvider<TState, Array<any>, any>,
    TKey extends string
  >(
    key: TKey,
    provider: TProvider
  ): Server<TState, TRequest, ContextWith<TState, TContext, TKey, TProvider>>;

  WithHandler(
    pattern: string,
    method: string,
    handler: Handler<TState, TRequest, TContext>
  ): Server<TState, TRequest, TContext>;

  Listen(port: number): Promise<void>;
};
