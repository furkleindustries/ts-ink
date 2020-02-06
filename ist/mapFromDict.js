export const mapFromDict = (dict) => (Object.keys(dict).reduce((map, key) => {
    map.set(key, dict[key]);
    return map;
}, new Map()));
//# sourceMappingURL=mapFromDict.js.map