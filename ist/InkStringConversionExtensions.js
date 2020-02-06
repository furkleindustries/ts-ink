"use strict";
class InkStringConversionExtensions {
}
InkStringConversionExtensions.ToStringsArray = (list) => {
    let count = list.length;
    var strings = new Array(count);
    for (let ii = 0; ii < count; ii += 1) {
        strings[ii] = ('ToString' in list[ii]) ?
            list[ii].ToString() :
            String(list[ii]);
    }
    return strings;
};
//# sourceMappingURL=InkStringConversionExtensions.js.map