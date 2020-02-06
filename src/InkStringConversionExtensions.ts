abstract class InkStringConversionExtensions {
  public static readonly ToStringsArray = (list: any[]): string[] => {
    let count = list.length;
    var strings = new Array(count);

    for(let ii = 0; ii < count; ii += 1) {
      strings[ii] = ('ToString' in list[ii]) ?
        (list[ii] as any).ToString() :
        String(list[ii]);
    }

    return strings;
  };
}
