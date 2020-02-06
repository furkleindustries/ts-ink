// Order is significant for type coersion.
// If types aren't directly compatible for an operation,
// they're coerced to the same type, downward.
// Higher value types "infect" an operation.
// (This may not be the most sensible thing to do, but it's worked so far!)
export var ValueType;
(function (ValueType) {
    // Used in coersion
    ValueType[ValueType["Int"] = 0] = "Int";
    ValueType[ValueType["Float"] = 1] = "Float";
    ValueType[ValueType["List"] = 2] = "List";
    ValueType[ValueType["String"] = 3] = "String";
    // Not used for coersion described above
    ValueType[ValueType["DivertTarget"] = 4] = "DivertTarget";
    ValueType[ValueType["VariablePointer"] = 5] = "VariablePointer";
})(ValueType || (ValueType = {}));
//# sourceMappingURL=ValueType.js.map