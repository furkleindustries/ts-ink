export const mapFromDict = <K extends string | number | symbol, V>(
  dict: Record<K, V>,
): Map<K, V> => (
  Object.keys(dict).reduce((map, key) => {
    map.set(key as K, dict[key as K]);
    return map;
  }, new Map<K, V>())
);
