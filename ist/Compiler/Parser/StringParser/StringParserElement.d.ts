export declare class StringParserElement {
    static _uniqueIdCounter: number;
    characterIndex: number;
    lineIndex: number;
    reportedErrorInScope: boolean;
    uniqueId: number;
    customFlags: number;
    readonly CopyFrom: (fromElement: StringParserElement) => void;
    readonly SquashFrom: (fromElement: StringParserElement) => void;
}
