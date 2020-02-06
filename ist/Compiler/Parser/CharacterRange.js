import { CharacterSet, } from './CharacterSet';
/// <summary>
/// A class representing a character range. Allows for lazy-loading a corresponding <see cref="CharacterSet">character set</see>.
/// </summary>
export class CharacterRange {
    constructor(_start, _end, excludes = []) {
        this._start = _start;
        this._end = _end;
        this._correspondingCharSet = new CharacterSet();
        this._excludes = new Set();
        /// <summary>
        /// Returns a <see cref="CharacterSet">character set</see> instance corresponding to the character range
        /// represented by the current instance.
        /// </summary>
        /// <remarks>
        /// The internal character set is created once and cached in memory.
        /// </remarks>
        /// <returns>The char set.</returns>
        this.ToCharacterSet = () => {
            if (this._correspondingCharSet.set.size === 0) {
                for (let ii = this.start, c = this._correspondingCharSet[ii]; ii <= this.end; ii += 1) {
                    if (!this._excludes.has(c)) {
                        this._correspondingCharSet.AddCharacters(c);
                    }
                }
            }
            return this._correspondingCharSet;
        };
        if (excludes instanceof CharacterSet) {
            this._excludes = excludes.set;
        }
        else {
            for (const item of excludes) {
                this._excludes.add(item);
            }
        }
    }
    get start() {
        return this._start;
    }
    get end() {
        return this._end;
    }
}
CharacterRange.Define = (start, end, excludes = null) => new CharacterRange(start, end, excludes);
//# sourceMappingURL=CharacterRange.js.map