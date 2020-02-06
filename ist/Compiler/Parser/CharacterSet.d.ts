export declare class CharacterSet {
    static readonly FromRange: (start: string, end: string) => CharacterSet;
    set: Set<string>;
    constructor(arg?: string | string[] | CharacterSet);
    readonly Add: (arg: string) => Set<string>;
    readonly AddRange: (start: string, end: string) => CharacterSet;
    readonly AddCharacters: (chars: string | string[] | CharacterSet) => CharacterSet;
}
