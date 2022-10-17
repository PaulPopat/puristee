// deno-lint-ignore-file no-explicit-any
import CreateState, { State, Writify } from "@fs_db";
import { GetBestMatch } from "./path.ts";
import ParseRequest from "./request-parser.ts";
import Send from "./response-applier.ts";
import {
  FinalHandler,
  Handler,
  HandlerFactory,
  InternalHandler,
  IsContinueResponse,
  Server,
  ServerFactory,
  StateProviders,
} from "./server.ts";
import { Map } from "./object.ts";

const CreateServer: ServerFactory = async <
  TState extends State,
  TProviders extends StateProviders<TState>
>(
  state_dir: string,
  init: Writify<TState>,
  providers: TProviders
) => {
  type This = Server<TState, TProviders>;
  const state_manager = await CreateState(state_dir, init);
  const final_providers = Map(
    providers,
    (_, value) =>
      (...args: any[]) =>
        value(state_manager.GetState(), ...args)
  );

  const handlers: Record<
    string,
    Record<string, FinalHandler<TState, TProviders>>
  > = {};

  return {
    CreateHandler(pattern, method): HandlerFactory<TState, TProviders> {
      const Internal = <TContext = never>(
        outer_handler: Handler<TState, TProviders, TContext>
      ) => {
        return {
          With<TResult>(
            handler: InternalHandler<TState, TProviders, TContext, TResult>
          ) {
            return Internal(async (request, state, providers) => {
              const outer = await outer_handler(request, state, providers);
              if (IsContinueResponse(outer))
                return await handler(request, state, providers, outer.context);

              return outer;
            });
          },
          Register() {
            handlers[method][pattern] = async (request, state, providers) => {
              const outer = await outer_handler(request, state, providers);
              if (IsContinueResponse(outer))
                throw new Error(
                  "The last handler in a chain must return a server response"
                );

              return outer;
            };
          },
        };
      };

      return Internal(() => ({
        response: { status: 404, headers: {}, body: "" },
        state: {},
      }));
    },
    async Listen(port) {
      const state_engine = await CreateState(state_dir, init);

      async function Run(request: Request) {
        try {
          const options = Object.keys(handlers[request.method]);
          const url = new URL(request.url);
          const target = GetBestMatch(url.pathname, options);
          if (!target) return new Response("", { status: 404 });

          const handler = handlers[request.method][target];
          const current_state = state_engine.GetState();
          const { state, response } = await handler(
            await ParseRequest(request, target),
            current_state,
            final_providers as any
          );

          await state_engine.SetState(state);

          return Send(response);
        } catch (err) {
          console.error(err);
          return new Response("", { status: 500 });
        }
      }

      async function serve_http(conn: Deno.Conn) {
        const connection = Deno.serveHttp(conn);
        for await (const event of connection) {
          event.respondWith(await Run(event.request));
        }
      }

      const server = Deno.listen({ port });
      for await (const conn of server) {
        serve_http(conn);
      }
    },
  };
};

export default CreateServer;

export type { Request, Response, Handler } from "./server.ts";
