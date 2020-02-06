import { Argument } from './ParsedHierarchy/Argument';
import { AuthorWarning } from './ParsedHierarchy/AuthorWarning';
import { BinaryExpression } from './ParsedHierarchy/Expression/BinaryExpression';
import { CharacterRange } from './CharacterRange';
import { CharacterSet } from './CharacterSet';
import { Choice } from './ParsedHierarchy/Choice';
import { Conditional } from './ParsedHierarchy/Conditional/Conditional';
import { ConditionalSingleBranch } from './ParsedHierarchy/Conditional/ConditionalSingleBranch';
import { ContentList } from './ParsedHierarchy/ContentList';
import { Divert } from './ParsedHierarchy/Divert/Divert';
import { Expression } from './ParsedHierarchy/Expression/Expression';
import { ErrorHandler } from '../../ErrorHandler';
import { ExternalDeclaration } from './ParsedHierarchy/Declaration/ExternalDeclaration';
import { FlowDecl } from './FlowDecl';
import { Gather } from './ParsedHierarchy/Gather/Gather';
import { Glue } from './ParsedHierarchy/Glue';
import { IFileHandler } from '../../IFileHandler';
import { InfixOperator } from './InfixOperator';
import { Knot } from './ParsedHierarchy/Knot';
import { ListDefinition } from './ParsedHierarchy/List/ListDefinition';
import { ListElementDefinition } from './ParsedHierarchy/List/ListElementDefinition';
import { Object } from './ParsedHierarchy/Object';
import { ReturnType } from './ParsedHierarchy/ReturnType';
import { Sequence } from './ParsedHierarchy/Sequence/Sequence';
import { SequenceType } from './ParsedHierarchy/Sequence/SequenceType';
import { StatementLevel } from './StatementLevel';
import { Story } from './ParsedHierarchy/Story';
import { StringExpression } from './ParsedHierarchy/Expression/StringExpression';
import { StringParser, ParseRule, ParseRuleReturn, ParseSuccess } from './StringParser/StringParser';
import { StringParserElement } from './StringParser/StringParserElement';
import { Tag } from './ParsedHierarchy/Tag';
import { Text } from './ParsedHierarchy/Text';
import { VariableAssignment } from './ParsedHierarchy/Variable/VariableAssignment';
export declare enum ErrorType {
    Author = 0,
    Error = 1,
    Warning = 2
}
export declare class InkParser extends StringParser {
    private _filename;
    private _externalErrorHandler;
    private _fileHandler;
    /**
     * Begin base InkParser section.
     */
    constructor(str: string, _filename?: string, _externalErrorHandler?: ErrorHandler, rootParser?: InkParser, _fileHandler?: IFileHandler);
    readonly Parse: () => Story;
    readonly SeparatedList: <T extends ParseRule>(mainRule: T, separatorRule: ParseRule) => ParseRuleReturn[];
    readonly PreProcessInputString: (str: string) => string;
    readonly RuleDidSucceed: (result: ParseRuleReturn, stateAtStart: StringParserElement, stateAtEnd: StringParserElement) => void;
    get parsingStringExpression(): boolean;
    set parsingStringExpression(value: boolean);
    readonly OnError: (message: string, index: number, lineIndex: number, isWarning: boolean) => void;
    readonly AuthorWarning: () => AuthorWarning;
    /**
     * End base InkParser section.
     */
    /**
     * Begin CharacterRanges section.
     */
    static readonly LatinBasic: CharacterRange;
    static readonly LatinExtendedA: CharacterRange;
    static readonly LatinExtendedB: CharacterRange;
    static readonly Greek: CharacterRange;
    static readonly Cyrillic: CharacterRange;
    static readonly Armenian: CharacterRange;
    static readonly Hebrew: CharacterRange;
    static readonly Arabic: CharacterRange;
    static readonly Korean: CharacterRange;
    private readonly ExtendIdentifierCharacterRanges;
    static readonly ListAllCharacterRanges: () => CharacterRange[];
    /**
     * End CharacterRanges section.
     */
    /**
     * Begin Choices section.
     */
    _parsingChoice: boolean;
    readonly Choice: () => Choice;
    readonly ChoiceCondition: () => Expression;
    readonly ChoiceConditionsSpace: () => typeof ParseSuccess;
    readonly ChoiceSingleCondition: () => Expression;
    readonly Gather: () => Gather;
    readonly GatherDashes: () => number;
    readonly ParseDashNotArrow: () => ParseRuleReturn;
    readonly BracketedName: () => string;
    /**
     * End Choices section.
     */
    /**
     * Begin Conditional section.
     */
    readonly InnerConditionalContent: (initialQueryExpression: Expression) => Conditional;
    readonly InlineConditionalBranches: () => ConditionalSingleBranch[];
    readonly MultilineConditionalBranches: () => ConditionalSingleBranch[];
    readonly SingleMultilineCondition: () => ConditionalSingleBranch;
    readonly ConditionExpression: () => Object;
    readonly ElseExpression: () => typeof ParseSuccess;
    /**
     * End Conditional section.
     */
    /**
     * Begin Content section.
     */
    _nonTextPauseCharacters: CharacterSet;
    _nonTextEndCharacters: CharacterSet;
    _notTextEndCharactersChoice: CharacterSet;
    _notTextEndCharactersString: CharacterSet;
    readonly TrimEndWhitespace: (mixedTextAndLogicResults: Object[], terminateWithSpace: boolean) => void;
    readonly LineOfMixedTextAndLogic: () => Object[];
    readonly MixedTextAndLogic: () => Object[];
    readonly ContentText: () => Text;
    readonly ContentTextAllowingEscapeChar: () => Text;
    readonly ContentTextNoEscape: () => string;
    /**
     * End Content section.
     */
    /**
     * Begin Divert section.
     */
    readonly MultiDivert: () => Object[];
    readonly StartThread: () => Divert;
    readonly DivertIdentifierWithArguments: () => Divert;
    readonly SingleDivert: () => Divert;
    readonly DotSeparatedDivertPathComponents: () => string[];
    readonly ParseDivertArrowOrTunnelOnwards: () => string;
    readonly ParseDivertArrow: () => string;
    readonly ParseThreadArrow: () => string;
    /**
     * End Divert section.
     */
    /**
   * Begin Expressions section.
   */
    _binaryOperators: InfixOperator[];
    _maxBinaryOpLength: number;
    readonly TempDeclarationOrAssignment: () => Object;
    readonly DisallowIncrement: (expr: Object) => void;
    readonly ParseTempKeyword: () => boolean;
    readonly ReturnStatement: () => ReturnType;
    readonly Expression: (minimumPrecedence?: number) => Expression;
    readonly ExpressionUnary: () => Expression;
    readonly ExpressionNot: () => string;
    readonly ExpressionLiteral: () => Expression;
    readonly ExpressionDivertTarget: () => Expression;
    readonly ExpressionInt: () => number;
    readonly ExpressionFloat: () => number;
    readonly ExpressionString: () => StringExpression;
    readonly ExpressionBool: () => number;
    readonly ExpressionFunctionCall: () => Expression;
    readonly ExpressionFunctionCallArguments: () => Expression[];
    readonly ExpressionVariableName: () => Expression;
    readonly ExpressionParen: () => Expression;
    readonly ExpressionInfixRight: (left: Expression, op: InfixOperator) => BinaryExpression | null;
    private readonly ParseInfixOperator;
    readonly ExpressionList: () => string[];
    readonly ListMember: () => string;
    readonly RegisterExpressionOperators: () => void;
    readonly RegisterBinaryOperator: (op: string, precedence: number, requireWhitespace?: boolean) => void;
    /**
     * End Expressions section.
     */
    /**
     * Begin Include section.
     */
    private _rootParser;
    private _openFilenames;
    readonly IncludeStatement: () => any;
    readonly FilenameIsAlreadyOpen: (fullFilename: string) => boolean;
    readonly AddOpenFilename: (fullFilename: string) => void;
    readonly RemoveOpenFilename: (fullFilename: string) => void;
    /**
     * End Include section.
     */
    /**
   * Begin Knot section.
   */
    readonly KnotDefinition: () => Knot;
    readonly KnotDeclaration: () => FlowDecl;
    readonly KnotTitleEquals: () => string;
    readonly StitchDefinition: () => ParseRuleReturn;
    readonly StitchDeclaration: () => FlowDecl;
    readonly KnotStitchNoContentRecoveryRule: () => ParseRuleReturn;
    readonly BracketedKnotDeclArguments: () => Argument[];
    readonly FlowDeclArgument: () => Argument;
    readonly ExternalDeclaration: () => ExternalDeclaration;
    /**
     * End Knot section.
     */
    /**
     * Start Logic section.
     */
    private _identifierCharSet;
    get identifierCharSet(): CharacterSet;
    readonly LogicLine: () => Object;
    readonly VariableDeclaration: () => Object;
    readonly ListDeclaration: () => VariableAssignment;
    readonly ListDefinition: () => ListDefinition;
    readonly ListElementDefinitionSeparator: () => string;
    readonly ListElementDefinition: () => ListElementDefinition | null;
    readonly ConstDeclaration: () => Object;
    readonly InlineLogicOrGlue: () => Object;
    readonly Glue: () => Glue;
    readonly InlineLogic: () => ContentList | null;
    readonly InnerLogic: () => Object;
    readonly InnerExpression: () => Object;
    readonly Identifier: () => string;
    /**
     * End Logic section.
     */
    /**
   * Begin Sequences section.
   */
    _sequenceTypeSymbols: CharacterSet;
    readonly InnerSequence: () => Sequence;
    readonly SequenceTypeAnnotation: () => ParseRuleReturn;
    readonly SequenceTypeSymbolAnnotation: () => ParseRuleReturn;
    readonly SequenceTypeWordAnnotation: () => ParseRuleReturn;
    readonly SequenceTypeSingleWord: () => SequenceType | null;
    readonly InnerSequenceObjects: () => ContentList[];
    readonly InnerInlineSequenceObjects: () => ContentList[];
    readonly InnerMultilineSequenceObjects: () => ContentList[];
    readonly SingleMultilineSequenceElement: () => ContentList | null;
    /**
     * End Sequences section.
     */
    /**
   * Begin Statements section.
   */
    private _statementRulesAtLevel;
    private _statementBreakRulesAtLevel;
    readonly StatementsAtLevel: (level: StatementLevel) => Object[];
    readonly StatementAtLevel: (level: StatementLevel) => Object;
    readonly StatementsBreakForLevel: (level: StatementLevel) => ParseRuleReturn;
    readonly GenerateStatementLevelRules: () => void;
    readonly SkipToNextLine: () => typeof ParseSuccess;
    readonly Line: (inlineRule: ParseRule) => ParseRule;
    /**
     * End Statements section.
     */
    /**
   * Begin Tags section.
   */
    private _endOfTagCharSet;
    readonly Tag: () => Tag;
    readonly Tags: () => Tag[];
    /**
     * End Tags section.
     */
    /**
     * Begin Whitespace section.
     */
    private _inlineWhitespaceChars;
    readonly EndOfLine: () => any;
    readonly Newline: () => typeof ParseSuccess | null;
    readonly EndOfFile: () => typeof ParseSuccess | null;
    readonly MultilineWhitespace: () => typeof ParseSuccess | null;
    readonly Whitespace: () => typeof ParseSuccess | null;
    readonly Spaced: (rule: ParseRule) => ParseRule;
    readonly AnyWhitespace: () => typeof ParseSuccess | null;
    readonly MultiSpaced: (rule: ParseRule) => ParseRuleReturn;
}
