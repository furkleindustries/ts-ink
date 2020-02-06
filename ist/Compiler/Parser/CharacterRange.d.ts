import { CharacterSet } from './CharacterSet';
export declare class CharacterRange {
    private _start;
    private _end;
    static Define: (start: string, end: string, excludes?: string[] | CharacterSet) => CharacterRange;
    private _correspondingCharSet;
    private _excludes;
    constructor(_start: string, _end: string, excludes?: string[] | CharacterSet);
    get start(): string;
    get end(): string;
    readonly ToCharacterSet: () => CharacterSet;
}
