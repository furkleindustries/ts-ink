import { CharacterSet } from './CharacterSet';
import { StringParser } from './StringParser/StringParser';
export declare class CommentEliminator extends StringParser {
    _commentOrNewlineStartCharacter: CharacterSet;
    _commentBlockEndCharacter: CharacterSet;
    _newlineCharacters: CharacterSet;
    readonly Process: () => string;
    readonly MainInk: () => any;
    readonly CommentsAndNewlines: () => string | null;
    readonly ParseSingleComment: () => string | null;
    readonly EndOfLineComment: () => "" | null;
    readonly BlockComment: () => string | null;
}
