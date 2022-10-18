import { Readify, State } from "./deps.ts";
import { Request, ServerResponse } from "./server.ts";

export default function HandlerFactory<TState extends State, TProviders>(
  get_state: () => Readify<TState>,
  providers: TProviders,
  register: (handler: (request: Request) => ServerResponse<TState>) => void
) {
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
    outer_handler: (request: Request) => FullResponse<TResponse>
  ) => {
    return {
      With<TResult extends Record<never, never>>(
        handler: (
          request: Request,
          state: Readify<TState>,
          providers: TProviders,
          context: TResponse
        ) => FullResponse<TResult>
      ) {
        return Internal((request) => {
          const outer = outer_handler(request);
          if (IsContextResponse(outer)) {
            const response = handler(
              request,
              get_state(),
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
          request: Request,
          state: Readify<TState>,
          providers: TProviders,
          context: TResponse
        ) => ServerResponse<TState>
      ) {
        register((request: Request) => {
          const outer = outer_handler(request);
          if (IsContextResponse(outer)) {
            return final(request, get_state(), providers, outer.context);
          }

          return outer;
        });
      },
    };
  };

  return Internal(() => ({ continue: true, context: {} }));
}
