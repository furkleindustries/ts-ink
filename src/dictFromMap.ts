export const dictFromMap = <K extends string | number | symbol, V>(
  map: Map<K, V>,
): Record<K, V> => (
  Array.from(map.keys()).reduce((dict, key) => {
    dict[key as any] = map.get(key);
    return dict;
  }, {} as Record<K, V>)
);
