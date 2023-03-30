import { Schema, StateReader, StateWriter } from "./deps.ts";
import PureRequest from "./pure-request.ts";
import { ReadonlyRecord } from "./util-types.ts";
import * as Jsx from "./jsx.ts";
import { SetCookie } from "./set-cookies.ts";

export type PureResponse =
  | ({
      readonly status: number;
      readonly headers?: ReadonlyRecord<string, string>;
      readonly cookies?: Record<string, SetCookie>;
    } & ({ readonly body?: unknown } | { readonly jsx: Jsx.Node }))
  | Response;

export type ServerResponse<TState extends Schema> =
  | {
      state?: StateWriter<TState>;
      response: PureResponse;
    }
  | PureResponse;

export type Handler<TState extends Schema, TProviders> = (
  request: PureRequest,
  state: StateReader<TState>,
  providers?: TProviders
) => ServerResponse<TState> | Promise<ServerResponse<TState>>;

type ContextResponse<TContext extends Record<never, never>> = {
  continue: true;
  context: TContext;
};

type FullResponse<
  TState extends Schema,
  TContext extends Record<never, never>
> = ServerResponse<TState> | ContextResponse<TContext>;

export type Middleware<
  TState extends Schema,
  TProviders,
  TContext extends Record<never, never>,
  TResponse extends Record<never, never>
> = (
  request: PureRequest,
  state: StateReader<TState>,
  providers: TProviders | undefined,
  context: TContext
) => FullResponse<TState, TResponse> | Promise<FullResponse<TState, TResponse>>;

export default function HandlerFactory<TState extends Schema, TProviders>(
  register: (handler: Handler<TState, TProviders>) => void
) {
  const IsContextResponse = <TContext extends Record<never, never>>(
    arg: FullResponse<TState, TContext>
  ): arg is ContextResponse<TContext> => "continue" in arg;

  const Internal = <TResponse extends Record<never, never>>(
    outer_handler: Middleware<TState, TProviders, never, TResponse>
  ) => {
    return {
      With<TResult extends Record<never, never>>(
        handler: Middleware<TState, TProviders, TResponse, TResult>
      ) {
        return Internal(async (request, state, providers) => {
          const outer = await outer_handler(
            request,
            state,
            providers,
            undefined as never
          );
          if (IsContextResponse(outer)) {
            const response = await handler(
              request,
              state,
              providers,
              outer.context
            );

            if (IsContextResponse(response))
              return {
                continue: true,
                context: Object.assign(outer.context, response.context),
              };
            return response;
          }

          return outer;
        });
      },
      Register(
        final: (
          request: PureRequest,
          state: StateReader<TState>,
          providers: TProviders | undefined,
          context: TResponse
        ) => ServerResponse<TState> | Promise<ServerResponse<TState>>
      ) {
        register(async (request, state, providers) => {
          const outer = await outer_handler(
            request,
            state,
            providers,
            undefined as never
          );
          if (IsContextResponse(outer)) {
            return await final(request, state, providers, outer.context);
          }

          return outer;
        });
      },
    };
  };

  return Internal(() => ({ continue: true, context: {} }));
}
