export class CharacterSet {
    constructor(arg) {
        this.set = new Set();
        this.Add = (arg) => (this.set.add(arg));
        this.AddRange = (start, end) => {
            for (let c = start.charCodeAt(0); c <= end.charCodeAt(0); ++c) {
                this.Add(String.fromCharCode(c));
            }
            return this;
        };
        this.AddCharacters = (chars) => {
            if (typeof chars === 'string' || Array.isArray(chars)) {
                for (const c of chars) {
                    this.Add(c);
                }
            }
            else {
                for (const c of chars.set) {
                    this.Add(c);
                }
            }
            return this;
        };
        this.AddCharacters(arg);
    }
}
CharacterSet.FromRange = (start, end) => (new CharacterSet().AddRange(start, end));
//# sourceMappingURL=CharacterSet.js.map