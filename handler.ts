import { Readify, State } from "./deps.ts";
import { Handler } from "./handler-store.ts";
import PureRequest from "./pure-request.ts";
import { ServerResponse } from "./server.ts";

export default function HandlerFactory<TState extends State, TProviders>(
  register: (handler: Handler<TState, TProviders>) => void
) {
  type HandlerArgs = Parameters<Handler<TState, TProviders>>;
  type ContextResponse<TContext extends Record<never, never>> = {
    continue: true;
    context: TContext;
  };
  type FullResponse<TContext extends Record<never, never>> =
    | ServerResponse<TState>
    | ContextResponse<TContext>;

  const IsContextResponse = <TContext extends Record<never, never>>(
    arg: FullResponse<TContext>
  ): arg is ContextResponse<TContext> => "continue" in arg;

  const Internal = <TResponse extends Record<never, never>>(
    outer_handler: (
      ...args: HandlerArgs
    ) => FullResponse<TResponse> | Promise<FullResponse<TResponse>>
  ) => {
    return {
      With<TResult extends Record<never, never>>(
        handler: (
          request: PureRequest,
          state: Readify<TState>,
          providers: TProviders,
          context: TResponse
        ) => FullResponse<TResult> | Promise<FullResponse<TResult>>
      ) {
        return Internal(async (request, state, providers) => {
          const outer = await outer_handler(request, state, providers);
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
          state: Readify<TState>,
          providers: TProviders,
          context: TResponse
        ) => ServerResponse<TState> | Promise<ServerResponse<TState>>
      ) {
        register(async (request, state, providers) => {
          const outer = await outer_handler(request, state, providers);
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
