import { StringParserElement } from './StringParserElement';
export declare class StringParserState {
    private _stack;
    private _numElements;
    get currentElement(): StringParserElement;
    get lineIndex(): number;
    set lineIndex(value: number);
    get characterIndex(): number;
    set characterIndex(value: number);
    get customFlags(): number;
    set customFlags(value: number);
    get errorReportedAlreadyInScope(): boolean;
    get stackHeight(): number;
    readonly StringParserState: () => void;
    readonly Push: () => number;
    readonly Pop: (expectedRuleId: number) => void;
    Peek: (expectedRuleId: number) => StringParserElement;
    readonly PeekPenultimate: () => StringParserElement;
    readonly Squash: () => void;
    readonly NoteErrorReported: () => void;
}
