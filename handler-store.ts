import { State } from "./deps.ts";
import { Handler } from "./handler.ts";
import Pattern from "./pattern.ts";

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
