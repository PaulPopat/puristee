import { State, Readify } from "./deps.ts";

export default class Provider<TState extends State> {
  public constructor(private readonly state: Readify<TState>) {}

  protected get State() {
    return this.state;
  }
}
