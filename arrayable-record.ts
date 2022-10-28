export default class ArrayableRecord<T> {
  private data: Array<[string, T]> = [];

  public Add(key: string, value: T) {
    this.data = [...this.data, [key, value]];
  }

  public get Record() {
    const result: Record<string, T | Array<T>> = {};

    for (const [key, value] of this.data)
      if (result[key])
        if (Array.isArray(result[key]))
          result[key] = [...(result[key] as T[]), value];
        else result[key] = [result[key] as T, value];
      else result[key] = value;

    return result;
  }
}
