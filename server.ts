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

export type StateProvider<
  TState extends State,
  TArgs extends Array<any>,
  TReturn
> = (state: Readify<TState>, ...args: TArgs) => Promise<TReturn> | TReturn;

export type StatedProvider<TState extends State, T> = T extends StateProvider<
  TState,
  infer A,
  infer R
>
  ? (...args: A) => Promise<R> | R
  : never;

export type StateProviders<TState extends State> = Record<
  string,
  StateProvider<TState, Array<any>, any>
>;

export type BoundProviders<
  TState extends State,
  TProviders extends StateProviders<TState>
> = {
  [TKey in keyof TProviders]: StatedProvider<TState, TProviders[TKey]>;
};

type HandlerServerResponse<TState extends State> = {
  state: Writify<TState>;
  response: Response;
};

type HandlerContinueResponse<TResult> = { continue: true; context: TResult };

type HandlerResponse<TState extends State, TResult> =
  | HandlerServerResponse<TState>
  | HandlerContinueResponse<TResult>;

export function IsContinueResponse<TState extends State, TResult>(
  arg: HandlerResponse<TState, TResult>
): arg is HandlerContinueResponse<TResult> {
  return "continue" in arg;
}

export type HandlerFactory<
  TState extends State,
  TProviders extends StateProviders<TState>,
  TContext = never
> = {
  With<TResult>(
    handler: InternalHandler<TState, TProviders, TContext, TResult>
  ): HandlerFactory<TState, TProviders, TResult>;

  Register(): void;
};

export type InternalHandler<
  TState extends State,
  TProviders extends StateProviders<TState>,
  TContext,
  TResult
> = (
  request: Request,
  state: Readify<TState>,
  providers: BoundProviders<TState, TProviders>,
  context: TContext
) =>
  | Promise<HandlerResponse<TState, TResult>>
  | HandlerResponse<TState, TResult>;

export type Handler<
  TState extends State,
  TProviders extends StateProviders<TState>,
  TContext = never
> = (
  request: Request,
  state: Readify<TState>,
  providers: BoundProviders<TState, TProviders>
) =>
  | Promise<HandlerResponse<TState, TContext>>
  | HandlerResponse<TState, TContext>;

export type FinalHandler<
  TState extends State,
  TProviders extends StateProviders<TState>
> = (
  request: Request,
  state: Readify<TState>,
  providers: BoundProviders<TState, TProviders>
) => Promise<HandlerServerResponse<TState>> | HandlerServerResponse<TState>;

export type Server<
  TState extends State,
  TProviders extends StateProviders<TState>
> = {
  CreateHandler(
    pattern: string,
    method: string
  ): HandlerFactory<TState, TProviders>;

  Listen(port: number): Promise<void>;
};

export type ServerFactory = <
  TState extends State,
  TProviders extends StateProviders<TState>
>(
  state_dir: string,
  init: TState,
  providers: TProviders
) => Promise<Server<TState, TProviders>>;

export type HandlerFactoryFactory = <
  TState extends State,
  TProviders extends StateProviders<TState>
>(
  server: Server<TState, TProviders>
) => HandlerFactory<TState, TProviders>;
