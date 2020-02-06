export const dictFromMap = (map) => (Array.from(map.keys()).reduce((dict, key) => {
    dict[key] = map.get(key);
    return dict;
}, {}));
//# sourceMappingURL=dictFromMap.js.map