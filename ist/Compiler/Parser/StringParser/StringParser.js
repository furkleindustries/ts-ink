import { CharacterSet, } from '../CharacterSet';
import { StringParserState, } from './StringParserState';
export const ParseSuccess = Symbol('ParseSuccessStruct');
export class StringParser {
    constructor(str) {
        // Don't do anything by default, but provide ability for subclasses
        // to manipulate the string before it's used as input (converted to a char array)
        this.PreProcessInputString = (str) => str;
        //--------------------------------
        // Parse state
        //--------------------------------
        this.BeginRule = () => this.state.Push();
        this.FailRule = (expectedRuleId) => {
            this.state.Pop(expectedRuleId);
            return null;
        };
        this.CancelRule = (expectedRuleId) => {
            this.state.Pop(expectedRuleId);
        };
        this.SucceedRule = (expectedRuleId, result = null) => {
            // Get state at point where this rule stared evaluating
            const stateAtSucceedRule = this.state.Peek(expectedRuleId);
            const stateAtBeginRule = this.state.PeekPenultimate();
            // Allow subclass to receive callback
            this.RuleDidSucceed(result, stateAtBeginRule, stateAtSucceedRule);
            // Flatten state stack so that we maintain the same values,
            // but remove one level in the stack.
            this.state.Squash();
            let finalResult = result;
            if (finalResult === null) {
                finalResult = StringParser.ParseSuccess;
            }
            return finalResult;
        };
        this.Expect = (rule, message = null, recoveryRule = null) => {
            let result = this.ParseObject(rule);
            if (result === null) {
                if (message === null) {
                    message = rule.name;
                }
                let butSaw;
                const lineRemainder = this.LineRemainder();
                if (lineRemainder === null || lineRemainder.length === 0) {
                    butSaw = 'end of line';
                }
                else {
                    butSaw = `'${lineRemainder}'`;
                }
                this.Error(`Expected ${message} but saw ${butSaw}`);
                if (recoveryRule !== null) {
                    result = recoveryRule();
                }
            }
            return result;
        };
        this.Error = (message, isWarning = false) => {
            this.ErrorOnLine(message, this.lineIndex + 1, isWarning);
        };
        this.ErrorWithParsedObject = (message, result, isWarning = false) => {
            this.ErrorOnLine(message, result.debugMetadata.startLineNumber, isWarning);
        };
        this.ErrorOnLine = (message, lineNumber, isWarning) => {
            if (!this.state.errorReportedAlreadyInScope) {
                const errorType = isWarning ? 'Warning' : 'Error';
                if (!this.errorHandler) {
                    throw new Error(`${errorType} on line ${lineNumber}: ${message}`);
                }
                else {
                    this.errorHandler(message, this.index, lineNumber - 1, isWarning);
                }
                this.state.NoteErrorReported();
            }
            if (!isWarning) {
                this.hadError = true;
            }
        };
        this.Warning = (message) => (this.Error(message, true));
        this.LineRemainder = () => this.Peek(() => this.ParseUntilCharactersFromString('\n\r'));
        this.SetFlag = (flag, trueOrFalse) => {
            if (trueOrFalse) {
                this.state.customFlags |= flag;
            }
            else {
                this.state.customFlags &= ~flag;
            }
        };
        this.GetFlag = (flag) => Boolean(this.state.customFlags & flag);
        //--------------------------------
        // Structuring
        //--------------------------------
        this.ParseObject = (rule) => {
            const ruleId = this.BeginRule();
            const stackHeightBefore = this.state.stackHeight;
            const result = rule();
            if (stackHeightBefore !== this.state.stackHeight) {
                throw new Error('Mismatched Begin/Fail/Succeed rules');
            }
            if (result === null) {
                return this.FailRule(ruleId);
            }
            this.SucceedRule(ruleId, result);
            return result;
        };
        this.Parse = (rule) => {
            const ruleId = this.BeginRule();
            const result = rule();
            if (result === null) {
                this.FailRule(ruleId);
                return null;
            }
            this.SucceedRule(ruleId, result);
            return result;
        };
        this.OneOf = (array) => {
            for (const rule of array) {
                const result = this.ParseObject(rule);
                if (result !== null) {
                    return result;
                }
            }
            return null;
        };
        this.OneOrMore = (rule) => {
            const results = [];
            let result = null;
            do {
                result = this.ParseObject(rule);
                if (result !== null) {
                    results.push(result);
                }
            } while (result !== null);
            if (results.length > 0) {
                return results;
            }
            return null;
        };
        this.Optional = (rule) => (() => this.ParseObject(rule) || StringParser.ParseSuccess);
        // Return ParseSuccess instead the real result so that it gets excluded
        // from result arrays (e.g. Interleave)
        this.Exclude = (rule) => (() => this.ParseObject(rule) && StringParser.ParseSuccess);
        // Combination of both of the above
        this.OptionalExclude = (rule) => (() => {
            this.ParseObject(rule);
            return StringParser.ParseSuccess;
        });
        // Convenience method for creating more readable ParseString rules that can be combined
        // in other structuring rules (like OneOf etc)
        // e.g. OneOf(String("one"), String("two"))
        this.String = (str) => (() => this.ParseString(str));
        this.TryAddResultToList = (result, list, flatten = true) => {
            if (result === StringParser.ParseSuccess) {
                return;
            }
            if (flatten) {
                const resultCollection = result;
                if (resultCollection !== null) {
                    for (const obj of resultCollection) {
                        list.push(obj);
                    }
                    return;
                }
            }
            list.push(result);
        };
        this.Interleave = (ruleA, ruleB, untilTerminator = null, flatten = true) => {
            const ruleId = this.BeginRule();
            const results = [];
            // First outer padding
            const firstA = this.ParseObject(ruleA);
            if (firstA === null) {
                return this.FailRule(ruleId);
            }
            else {
                this.TryAddResultToList(firstA, results, flatten);
            }
            let lastMainResult = null;
            let outerResult = null;
            do {
                // "until" condition hit?
                if (untilTerminator !== null && this.Peek(untilTerminator) !== null) {
                    break;
                }
                // Main inner
                lastMainResult = this.ParseObject(ruleB);
                if (lastMainResult === null) {
                    break;
                }
                else {
                    this.TryAddResultToList(lastMainResult, results, flatten);
                }
                // Outer result (i.e. last A in ABA)
                outerResult = null;
                if (lastMainResult !== null) {
                    outerResult = this.ParseObject(ruleA);
                    if (outerResult === null) {
                        break;
                    }
                    else {
                        this.TryAddResultToList(outerResult, results, flatten);
                    }
                }
                // Stop if there are no results, or if both are the placeholder "ParseSuccess" (i.e. Optional success rather than a true value)
            } while ((lastMainResult !== null || outerResult !== null) &&
                !(lastMainResult === StringParser.ParseSuccess && outerResult == StringParser.ParseSuccess) &&
                this.remainingLength > 0);
            if (results.length === 0) {
                return this.FailRule(ruleId);
            }
            return this.SucceedRule(ruleId, results);
        };
        //--------------------------------
        // Basic string parsing
        //--------------------------------
        this.ParseString = (str) => {
            if (str.length > this.remainingLength) {
                return null;
            }
            const ruleId = this.BeginRule();
            // Optimisation from profiling:
            // Store in temporary local variables
            // since they're properties that would have to access
            // the rule stack every time otherwise.
            let i = this.index;
            let li = this.lineIndex;
            let success = true;
            for (let tempIdx = 0; tempIdx < str.length; tempIdx += 1) {
                const c = str[tempIdx];
                if (this._chars[i] !== c) {
                    success = false;
                    break;
                }
                else if (c == '\n') {
                    li++;
                }
                i++;
            }
            this.index = i;
            this.lineIndex = li;
            if (success) {
                return this.SucceedRule(ruleId, str);
            }
            return this.FailRule(ruleId);
        };
        this.ParseSingleCharacter = () => {
            if (this.remainingLength > 0) {
                const c = this._chars[this.index];
                if (c === '\n') {
                    this.lineIndex += 1;
                }
                this.index += 1;
                return c;
            }
            else {
                return '0';
            }
        };
        this.ParseUntilCharactersFromString = (str, maxCount = -1) => (this.ParseCharactersFromString(str, false, maxCount));
        this.ParseUntilCharactersFromCharSet = (charSet, maxCount = -1) => (this.ParseCharactersFromCharSet(charSet, false, maxCount));
        this.ParseCharactersFromString = (str, maxCountOrShouldIncludeStrChars = -1, maxCount = -1) => {
            const charSet = new CharacterSet(str);
            if (typeof maxCountOrShouldIncludeStrChars === 'number') {
                return this.ParseCharactersFromCharSet(charSet, true, maxCountOrShouldIncludeStrChars);
            }
            return this.ParseCharactersFromCharSet(charSet, maxCountOrShouldIncludeStrChars, maxCount);
        };
        this.ParseCharactersFromCharSet = (charSet, shouldIncludeChars = true, maxCount = -1) => {
            if (maxCount === -1) {
                maxCount = Number.MAX_SAFE_INTEGER;
            }
            const startIndex = this.index;
            // Optimisation from profiling:
            // Store in temporary local variables
            // since they're properties that would have to access
            // the rule stack every time otherwise.
            let ii = this.index;
            let li = this.lineIndex;
            let count = 0;
            while (ii < this._chars.length &&
                charSet.set.has(this._chars[ii]) === shouldIncludeChars &&
                count < maxCount) {
                if (this._chars[ii] === '\n') {
                    li += 1;
                }
                ii += 1;
                count += 1;
            }
            this.index = ii;
            this.lineIndex = li;
            const lastCharIndex = this.index;
            if (lastCharIndex > startIndex) {
                return this._chars.slice(startIndex, this.index - startIndex).join('');
            }
            return null;
        };
        this.Peek = (rule) => {
            const ruleId = this.BeginRule();
            const result = rule();
            this.CancelRule(ruleId);
            return result;
        };
        // No need to Begin/End rule since we never parse a newline, so keeping oldIndex is good enough
        this.ParseInt = () => {
            const oldIndex = this.index;
            const negative = this.ParseString('-') !== null;
            // Optional whitespace
            this.ParseCharactersFromString(' \t');
            const parsedString = this.ParseCharactersFromCharSet(StringParser.numbersCharacterSet);
            if (parsedString === null) {
                // Roll back and fail
                this.index = oldIndex;
                return null;
            }
            let parsedInt;
            if (!Number.isNaN(Number(parsedString))) {
                parsedInt = Number(parsedString);
                return negative ? -parsedInt : parsedInt;
            }
            this.Error("Failed to read integer value: " + parsedString + ". Perhaps it's out of the range of acceptable numbers ink supports? (" + Number.MIN_SAFE_INTEGER + " to " + Number.MAX_SAFE_INTEGER + ")");
            return null;
        };
        // No need to Begin/End rule since we never parse a newline, so keeping oldIndex is good enough
        this.ParseFloat = () => {
            const oldIndex = this.index;
            const leadingInt = this.ParseInt();
            if (leadingInt !== null) {
                if (this.ParseString('.') !== null) {
                    const afterDecimalPointStr = this.ParseCharactersFromCharSet(StringParser.numbersCharacterSet);
                    return Number(`${leadingInt}.${afterDecimalPointStr}`);
                }
            }
            // Roll back and fail
            this.index = oldIndex;
            return null;
        };
        this.ParseNewline = () => {
            const ruleId = this.BeginRule();
            // Optional \r, definite \n to support Windows (\r\n) and Mac/Unix (\n)
            // 2nd May 2016: Always collapse \r\n to just \n
            this.ParseString('\r');
            if (this.ParseString('\n') === null) {
                return this.FailRule(ruleId);
            }
            return this.SucceedRule(ruleId, '\n');
        };
        const strPreProc = this.PreProcessInputString(str);
        this.state = new StringParserState();
        if (str) {
            this._chars = strPreProc.split('');
        }
        else {
            this._chars = [];
        }
        this.inputString = strPreProc;
    }
    get currentCharacter() {
        if (this.index >= 0 && this.remainingLength > 0) {
            return this._chars[this.index];
        }
        return '0';
    }
    get endOfInput() {
        return this.index >= this._chars.length;
    }
    get remainingString() {
        return this._chars.slice(this.index, this.remainingLength).join('');
    }
    get remainingLength() {
        return this._chars.length - this.index;
    }
    get lineIndex() {
        return this.state.lineIndex;
    }
    set lineIndex(value) {
        this.state.lineIndex = value;
    }
    get index() {
        // If we want subclass parsers to be able to set the index directly,
        // then we would need to know what the lineIndex of the new
        // index would be - would we have to step through manually
        // counting the newlines to do so?
        return this.state.characterIndex;
    }
    set index(value) {
        this.state.characterIndex = value;
    }
    ParseUntil(stopRule, pauseCharacters = null, endCharacters = null) {
        const ruleId = this.BeginRule();
        const pauseAndEnd = new CharacterSet();
        if (pauseCharacters !== null) {
            pauseAndEnd.set = new Set([
                ...pauseAndEnd.set.values(),
                ...pauseCharacters.set.values(),
            ]);
        }
        if (endCharacters !== null) {
            pauseAndEnd.set = new Set([
                ...pauseAndEnd.set.values(),
                ...endCharacters.set.values(),
            ]);
        }
        let parsedString = '';
        let ruleResultAtPause = null;
        // Keep attempting to parse strings up to the pause (and end) points.
        //  - At each of the pause points, attempt to parse according to the rule
        //  - When the end point is reached (or EOF), we're done
        do {
            // TODO: Perhaps if no pause or end characters are passed, we should check *every* character for stopRule?
            const partialParsedString = this.ParseUntilCharactersFromCharSet(pauseAndEnd);
            if (partialParsedString !== null) {
                parsedString += partialParsedString;
            }
            // Attempt to run the parse rule at this pause point
            ruleResultAtPause = this.Peek(stopRule);
            // Rule completed - we're done
            if (ruleResultAtPause !== null) {
                break;
            }
            else {
                if (this.endOfInput) {
                    break;
                }
                // Reached a pause point, but rule failed. Step past and continue parsing string
                const pauseCharacter = this.currentCharacter;
                if (pauseCharacters !== null && pauseCharacters.set.has(pauseCharacter)) {
                    parsedString += pauseCharacter;
                    if (pauseCharacter === '\n') {
                        this.lineIndex += 1;
                    }
                    this.index += 1;
                    continue;
                }
                else {
                    break;
                }
            }
        } while (true);
        if (parsedString.length > 0) {
            return this.SucceedRule(ruleId, String(parsedString));
        }
        return this.FailRule(ruleId);
    }
    ;
}
StringParser.ParseSuccess = ParseSuccess;
StringParser.numbersCharacterSet = new CharacterSet("0123456789");
//# sourceMappingURL=StringParser.js.map