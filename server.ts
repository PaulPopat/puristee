import {
  DeepMerge,
  Directory,
  MockedDirectory,
  Schema,
  StateReader,
  StateWriter,
} from "./deps.ts";
import Send from "./response-applier.ts";
import HandlerFactory from "./handler.ts";
import { HandlerStore } from "./handler-store.ts";
import Pattern from "./pattern.ts";
import PureRequest from "./pure-request.ts";
import TestRequest, { TestRequestInit } from "./test-request.ts";
import Provider from "./providers.ts";

export default function CreateServer<
  TSchema extends Schema,
  TProviders extends Provider<TSchema>
>(
  state_dir: string,
  schema: TSchema,
  provider: new (state: StateReader<TSchema>) => TProviders
) {
  const store = new HandlerStore<TSchema, TProviders>();

  async function Run(request: Request, current_state: StateReader<TSchema>) {
    try {
      const url = new URL(request.url);
      const target = store.Get(url, request.method);
      if (!target) {
        console.log(`No handler found for ${request.url}`);
        return { response: { status: 404 } };
      }

      console.log(`Handling request for ${request.url}`);
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
      return HandlerFactory<TSchema, TProviders>((handler) =>
        store.Add(method, new Pattern(pattern), handler)
      );
    },
    async Listen(port: number) {
      const state_manager = new Directory(schema, state_dir);
      async function serve_http(conn: Deno.Conn) {
        const connection = Deno.serveHttp(conn);
        for await (const event of connection) {
          const { response, state } = await Run(
            event.request,
            state_manager.Model
          );
          if (state) state_manager.Write(state);

          event.respondWith(await Send(response));
        }
      }

      const server = Deno.listen({ port });
      console.log(`Server listening on ${port}`);
      for await (const conn of server) {
        serve_http(conn);
      }
    },
    async Test(request: TestRequestInit, input_state: StateWriter<TSchema>) {
      const mocked_data = new MockedDirectory<TSchema>();
      mocked_data.Write(input_state);
      const result = await Run(new TestRequest(request), mocked_data.Model);
      return {
        response: result.response,
        state: result.state,
        full_state: DeepMerge(input_state, result.state ?? {}),
      };
    },
  };
}
