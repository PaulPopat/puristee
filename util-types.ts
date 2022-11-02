export type ReadonlyRecord<TKey extends string | number | symbol, TData> = {
  readonly [TK in TKey]: TData;
};
