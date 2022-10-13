// deno-lint-ignore-file no-explicit-any
import CreateState, { State, Writify } from "@fs_db";
import ApplyContext from "./context.ts";
import { GetBestMatch } from "./path.ts";
import ParseRequest from "./request-parser.ts";
import Send from "./response-applier.ts";
import {
  Handler,
  Request as PureRequest,
  RequestMiddleware,
  Server,
  ServerContext,
} from "./types.ts";

export default function CreateServer<TState extends State>(
  state_dir: string,
  init: Writify<TState>
) {
  const Internal = <
    TRequest extends PureRequest,
    TContext extends ServerContext<TState>
  >(
    request_middleware: RequestMiddleware<
      PureRequest,
      TRequest,
      TState,
      TContext
    >,
    context: TContext,
    handlers: Record<
      string,
      Record<string, Handler<TState, TRequest, TContext>>
    >
  ): Server<TState, TRequest, TContext> => ({
    WithMiddleware(middleware) {
      return Internal(
        (r, s, c) => {
          const bound_context = ApplyContext(s, c);
          return middleware(
            request_middleware(r, s, bound_context as any),
            s,
            bound_context as any
          );
        },
        context,
        handlers as any
      );
    },
    WithProvider(key, provider) {
      return Internal(
        request_middleware,
        { ...context, [key]: provider },
        handlers
      );
    },
    WithHandler(pattern, method, handler) {
      return Internal(request_middleware, context, {
        ...handlers,
        [method]: { ...(handlers[method] ?? {}), [pattern]: handler },
      });
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
          const ctx = ApplyContext(current_state, context);
          const { state, response } = handler(
            request_middleware(
              await ParseRequest(request, target),
              current_state,
              ctx
            ),
            current_state,
            ctx
          );

          state_engine.SetState(state);

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
  });

  return Internal((r) => r, {}, {});
}
