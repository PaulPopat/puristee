import { Readify, State } from "./deps.ts";
import { ServerResponse } from "./server.ts";
import Pattern from "./pattern.ts";
import PureRequest from "./pure-request.ts";

export type Handler<TState extends State, TProviders> = (
  request: PureRequest,
  state: Readify<TState>,
  providers: TProviders
) => ServerResponse<TState> | Promise<ServerResponse<TState>>;

export class HandlerStore<TState extends State, TProviders> {
  private data: Array<[string, Pattern, Handler<TState, TProviders>]> = [];

  public Add(
    method: string,
    pattern: Pattern,
    handler: Handler<TState, TProviders>
  ) {
    this.data = [...this.data, [method, pattern, handler]];
  }

  public Get(url: URL, method: string) {
    return this.data
      .filter(([m, p]) => m === method && p.IsMatch(url))
      .sort(([_1, p1], [_2, p2]) => p1.Score - p2.Score)[0];
  }
}
