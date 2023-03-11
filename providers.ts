import { Schema, StateReader } from "./deps.ts";

export default class Provider<TState extends Schema> {
  public constructor(private readonly state: StateReader<TState>) {}

  protected get State() {
    return this.state;
  }
}
