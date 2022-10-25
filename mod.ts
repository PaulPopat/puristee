// deno-lint-ignore-file no-explicit-any
import { CreateState, DeepMerge, Readify, State, Mock } from "./deps.ts";
import { GetBestMatch } from "./path.ts";
import ParseRequest from "./request-parser.ts";
import Send from "./response-applier.ts";
import { Request as PureRequest, ServerResponse } from "./server.ts";
import { Map } from "./object.ts";
import HandlerFactory from "./handler.ts";

export type TestRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

export default function CreateServer<
  TState extends State,
  TProviders extends Record<
    string,
    (this: Readify<TState>, ...args: any[]) => any
  >
>(state_dir: string, init: TState, providers: TProviders) {
  type BoundProviders = {
    [TKey in keyof TProviders]: (
      ...params: Parameters<TProviders[TKey]>
    ) => ReturnType<TProviders[TKey]>;
  };
  type Handler = (
    request: PureRequest,
    state: Readify<TState>,
    providers: BoundProviders
  ) => ServerResponse<TState> | Promise<ServerResponse<TState>>;

  const bind_providers = (state: Readify<TState>): BoundProviders =>
    Map(providers, (_, value) => value.bind(state) as any);

  const handlers: Record<string, Record<string, Handler>> = {};

  return {
    CreateHandler(pattern: string, method: string) {
      return HandlerFactory<TState, BoundProviders>((handler) => {
        handlers[method] = {
          ...handlers[method],
          [pattern]: handler,
        };
      });
    },
    async Listen(port: number) {
      const state_manager = await CreateState<TState>(state_dir, init);
      async function Run(request: Request) {
        try {
          const options = Object.keys(handlers[request.method]);
          const url = new URL(request.url);
          const target = GetBestMatch(url.pathname, options);
          if (!target) return new Response("", { status: 404 });

          const handler = handlers[request.method][target];
          const current_state = state_manager.GetState();
          const { state, response } = await handler(
            await ParseRequest(request, target),
            current_state,
            bind_providers(current_state)
          );

          if (state) await state_manager.SetState(state);

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
    async Test(request: TestRequest, input_state: TState) {
      const options = Object.keys(handlers[request.method]);
      const mocked_data = Mock(input_state);
      const url = new URL(request.url);
      const target = GetBestMatch(url.pathname, options);
      if (!target)
        throw new Error(
          `Failed to find match for ${request.method}: ${request.url}`
        );

      const handler = handlers[request.method][target];
      const result = await handler(
        await ParseRequest(
          {
            url: request.url,
            method: request.method,
            headers: (function* () {
              for (const key in request.headers)
                yield [key, request.headers[key]];
            })(),
            json() {
              return Promise.resolve(request.body);
            },
          },
          target
        ),
        mocked_data,
        bind_providers(mocked_data)
      );

      return {
        response: result.response,
        state: result.state,
        full_state: DeepMerge(input_state, result.state),
      };
    },
  };
}

export type { Request, Response } from "./server.ts";
export type { Readify, StatePart } from "./deps.ts";
