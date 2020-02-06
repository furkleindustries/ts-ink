import { StringParserElement, } from './StringParserElement';
export class StringParserState {
    constructor() {
        this.StringParserState = () => {
            const kExpectedMaxStackDepth = 200;
            this._stack = new Array(kExpectedMaxStackDepth);
            for (let ii = 0; ii < kExpectedMaxStackDepth; ++ii) {
                this._stack[ii] = new StringParserElement();
            }
            this._numElements = 1;
        };
        this.Push = () => {
            if (this._numElements >= this._stack.length) {
                throw new Error('Stack overflow in parser state.');
            }
            const prevElement = this._stack[this._numElements - 1];
            const newElement = this._stack[this._numElements];
            this._numElements++;
            newElement.CopyFrom(prevElement);
            return newElement.uniqueId;
        };
        this.Pop = (expectedRuleId) => {
            if (this._numElements == 1) {
                throw new Error('Attempting to remove final stack element is illegal! Mismatched Begin/Succceed/Fail?');
            }
            if (this.currentElement.uniqueId != expectedRuleId) {
                throw new Error('Mismatched rule IDs - do you have mismatched Begin/Succeed/Fail?');
            }
            // Restore state
            this._numElements -= 1;
        };
        this.Peek = (expectedRuleId) => {
            if (this.currentElement.uniqueId != expectedRuleId) {
                throw new Error('Mismatched rule IDs - do you have mismatched Begin/Succeed/Fail?');
            }
            return this._stack[this._numElements - 1];
        };
        this.PeekPenultimate = () => {
            if (this._numElements >= 2) {
                return this._stack[this._numElements - 2];
            }
            return null;
        };
        // Reduce stack height while maintaining currentElement
        // Remove second last element: i.e. "squash last two elements together"
        // Used when succeeding from a rule (and ONLY when succeeding, since
        // the state of the top element is retained).
        this.Squash = () => {
            if (this._numElements < 2) {
                throw new Error('Attempting to remove final stack element is illegal! Mismatched Begin/Succceed/Fail?');
            }
            const penultimateEl = this._stack[this._numElements - 2];
            const lastEl = this._stack[this._numElements - 1];
            penultimateEl.SquashFrom(lastEl);
            this._numElements -= 1;
        };
        this.NoteErrorReported = () => {
            for (const el of this._stack) {
                el.reportedErrorInScope = true;
            }
        };
    }
    get currentElement() {
        return this._stack[this._numElements - 1];
    }
    get lineIndex() {
        return this.currentElement.lineIndex;
    }
    set lineIndex(value) {
        this.currentElement.lineIndex = value;
    }
    get characterIndex() {
        return this.currentElement.characterIndex;
    }
    set characterIndex(value) {
        this.currentElement.characterIndex = value;
    }
    get customFlags() {
        return this.currentElement.customFlags;
    }
    set customFlags(value) {
        this.currentElement.customFlags = value;
    }
    get errorReportedAlreadyInScope() {
        return this.currentElement.reportedErrorInScope;
    }
    get stackHeight() {
        return this._numElements;
    }
}
//# sourceMappingURL=StringParserState.js.map