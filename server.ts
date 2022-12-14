import { CreateState, DeepMerge, Readify, State, Mock } from "./deps.ts";
import Send from "./response-applier.ts";
import HandlerFactory from "./handler.ts";
import { HandlerStore } from "./handler-store.ts";
import Pattern from "./pattern.ts";
import PureRequest from "./pure-request.ts";
import TestRequest, { TestRequestInit } from "./test-request.ts";
import Provider from "./providers.ts";

export default function CreateServer<
  TState extends State,
  TProviders extends Provider<TState>
>(
  state_dir: string,
  init: TState,
  provider: new (state: Readify<TState>) => TProviders
) {
  const store = new HandlerStore<TState, TProviders>();

  async function Run(request: Request, current_state: Readify<TState>) {
    try {
      const url = new URL(request.url);
      const target = store.Get(url, request.method);
      if (!target) return { response: { status: 404 } };

      const [_, pattern, handler] = target;
      const result = await handler(
        await PureRequest.Init(request, pattern),
        current_state,
        new provider(current_state)
      );

      if ("response" in result)
        return { response: result.response, state: result.state };

      return { response: result, state: undefined };
    } catch (err) {
      console.error(err);
      return { response: { status: 500 } };
    }
  }

  return {
    CreateHandler(pattern: string, method: string) {
      return HandlerFactory<TState, TProviders>((handler) =>
        store.Add(method, new Pattern(pattern), handler)
      );
    },
    async Listen(port: number) {
      const state_manager = await CreateState<TState>(state_dir, init);
      async function serve_http(conn: Deno.Conn) {
        const connection = Deno.serveHttp(conn);
        for await (const event of connection) {
          const { response, state } = await Run(
            event.request,
            state_manager.GetState()
          );
          if (state) await state_manager.SetState(state);

          event.respondWith(await Send(response));
        }
      }

      const server = Deno.listen({ port });
      console.log(`Server listening on ${port}`);
      for await (const conn of server) {
        serve_http(conn);
      }
    },
    async Test(request: TestRequestInit, input_state: TState) {
      const mocked_data = Mock(input_state);
      const result = await Run(new TestRequest(request), mocked_data);
      return {
        response: result.response,
        state: result.state,
        full_state: DeepMerge(input_state, result.state ?? {}),
      };
    },
  };
}
