# Puristee

This is a tool designed to make stateful and pure server code. It supports return JSON or JSX to make rest or HTML servers.

## The key concepts

### Handlers

Handlers are provided to handle requests. They should be completely pure.

### State

This is the main focus of this library. The state should be a type that is declared when creating a server. This is then provided for each request in a readonly fashion and a partial of it should be returned at the end processing.

## Examples

``` TypeScript
import CreateServer, { Provider, PureRequest, Readify } from "https://deno.land/x/puristee@VERSION/mod.ts";

type State = {
  data: string;
}

// Loaded on first setup
const InitialState: State = { data: "hello" };

// The state can be accessed directly in the handler but common functions can be added here
class StateProvider extends Provider<State> {
  public get Hello() {
    return this.State.data;
  }
}

const Server = CreateServer("./data", InitialState, StateProvider);

// Type anotations are not required
Server.CreateHandler("/hello", "GET")
  .Register(
    (request: PureRequest, s: Readify<State>, p: StateProvider, c: unknown) => {
      return {
        response: { status: 200, body: { message: s.data } }
      };
    }
  );

Server.CreateHandler("/hello", "PUT")
  .Register(
    (request: PureRequest, s: Readify<State>, p: StateProvider, c: unknown) => {
      return {
        response: { status: 200, body: { message: s.data } },
        state: { data: "world" }
      };
    }
  );
```