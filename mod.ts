// deno-lint-ignore-file no-explicit-any
import { CreateState, Readify, State, Writify } from "./deps.ts";
import { GetBestMatch } from "./path.ts";
import ParseRequest from "./request-parser.ts";
import Send from "./response-applier.ts";
import { Request as PureRequest, ServerResponse } from "./server.ts";
import { Map } from "./object.ts";
import HandlerFactory from "./handler.ts";

export default async function CreateServer<
  TState extends State,
  TProviders extends Record<
    string,
    (this: Readify<TState>, ...args: any[]) => any
  >
>(state_dir: string, init: Writify<TState>, providers: TProviders) {
  type Handler = (
    request: PureRequest
  ) => ServerResponse<TState> | Promise<ServerResponse<TState>>;

  const state_manager = await CreateState(state_dir, init);
  const final_providers = Map(
    providers,
    (_, value) => value.bind(state_manager.GetState()) as any
  );

  const handlers: Record<string, Record<string, Handler>> = {};

  return {
    CreateHandler(pattern: string, method: string) {
      return HandlerFactory(
        state_manager.GetState,
        final_providers,
        (handler) => {
          handlers[method][pattern] = handler;
        }
      );
    },
    async Listen(port: number) {
      async function Run(request: Request) {
        try {
          const options = Object.keys(handlers[request.method]);
          const url = new URL(request.url);
          const target = GetBestMatch(url.pathname, options);
          if (!target) return new Response("", { status: 404 });

          const handler = handlers[request.method][target];
          const { state, response } = await handler(
            await ParseRequest(request, target)
          );

          await state_manager.SetState(state);

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
}

export type { Request, Response } from "./server.ts";
export type { Readify } from "./deps.ts";
