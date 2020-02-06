import {
  Argument,
} from './ParsedHierarchy/Argument';
import {
  AuthorWarning,
} from './ParsedHierarchy/AuthorWarning';
import {
  BinaryExpression,
} from './ParsedHierarchy/Expression/BinaryExpression';
import {
  CharacterRange,
} from './CharacterRange';
import {
  CharacterSet,
} from './CharacterSet';
import {
  Choice
} from './ParsedHierarchy/Choice';
import {
  CommentEliminator,
} from './CommentEliminator';
import {
  Conditional,
} from './ParsedHierarchy/Conditional/Conditional';
import {
  ConditionalSingleBranch,
} from './ParsedHierarchy/Conditional/ConditionalSingleBranch';
import {
  ContentList,
} from './ParsedHierarchy/ContentList';
import {
  ConstantDeclaration,
} from './ParsedHierarchy/Declaration/ConstantDeclaration';
import {
  CustomFlags,
} from './CustomFlags';
import {
  DebugMetadata,
} from '../../DebugMetadata';
import {
  Divert,
} from './ParsedHierarchy/Divert/Divert';
import {
  DivertTarget,
} from './ParsedHierarchy/Divert/DivertTarget';
import {
  Expression,
} from './ParsedHierarchy/Expression/Expression';
import {
  ErrorHandler,
} from '../../ErrorHandler';
import {
  ExternalDeclaration,
} from './ParsedHierarchy/Declaration/ExternalDeclaration';
import {
  FlowDecl,
} from './FlowDecl';
import {
  FunctionCall,
} from './ParsedHierarchy/FunctionCall';
import {
  Gather,
} from './ParsedHierarchy/Gather/Gather';
import {
  Glue,
} from './ParsedHierarchy/Glue';
import {
  RuntimeGlue,
} from '../../Runtime/Glue';
import {
  IFileHandler,
} from '../../IFileHandler';
import {
  IncDecExpression,
} from './ParsedHierarchy/Expression/IncDecExpression';
import {
  IncludedFile,
} from './ParsedHierarchy/IncludedFile';
import {
  InfixOperator,
} from './InfixOperator';
import {
  Knot,
} from './ParsedHierarchy/Knot';
import {
  List,
} from './ParsedHierarchy/List/List';
import {
  ListDefinition,
} from './ParsedHierarchy/List/ListDefinition';
import {
  ListElementDefinition,
} from './ParsedHierarchy/List/ListElementDefinition';
import {
  MultipleConditionExpression,
} from './ParsedHierarchy/Expression/MultipleConditionExpression';
import {
  Object,
} from './ParsedHierarchy/Object';
import {
  Path,
} from './ParsedHierarchy/Path';
import {
  ReturnType,
} from './ParsedHierarchy/ReturnType';
import {
  Sequence,
} from './ParsedHierarchy/Sequence/Sequence';
import {
  SequenceType,
} from './ParsedHierarchy/Sequence/SequenceType';
import {
  StatementLevel,
} from './StatementLevel';
import {
  Stitch,
} from './ParsedHierarchy/Stitch';
import {
  Story,
} from './ParsedHierarchy/Story';
import {
  StringExpression,
} from './ParsedHierarchy/Expression/StringExpression';
import {
  StringParser,
  SpecificParseRule,
  ParseRule,
  ParseRuleReturn,
  ParseSuccess,
} from './StringParser/StringParser';
import {
  StringParserElement,
} from './StringParser/StringParserElement';
import {
  Tag,
} from './ParsedHierarchy/Tag';
import {
  RuntimeTag,
} from '../../Runtime/Tag';
import {
  Text,
} from './ParsedHierarchy/Text';
import {
  TunnelOnwards,
} from './ParsedHierarchy/TunnelOnwards';
import {
  VariableAssignment,
} from './ParsedHierarchy/Variable/VariableAssignment';
import {
  VariableReference,
} from './ParsedHierarchy/Variable/VariableReference';
import {
  UnaryExpression,
} from './ParsedHierarchy/Expression/UnaryExpression';

export enum ErrorType {
  Author,
  Error,
  Warning,
}

export class InkParser extends StringParser {
  /**
   * Begin base InkParser section.
   */

  constructor(
    str: string,
    private _filename: string = '',
    private _externalErrorHandler: ErrorHandler = null,
    rootParser: InkParser = null,
    private _fileHandler: IFileHandler = null,
  ) {
    super(str);
    
    this.RegisterExpressionOperators();
    this.GenerateStatementLevelRules();

    this.errorHandler = this.OnError;

    if (rootParser === null) {
      this._rootParser = this;
      this._openFilenames = [];

      if (this._filename !== null) {
        const fullRootInkPath = this._fileHandler.ResolveInkFilename(this._filename);
        this._openFilenames.push(fullRootInkPath);
      }
    } else {
      this._rootParser = rootParser;
    }
  }

  // Main entry point
  public readonly Parse = (): Story => {
    const topLevelContent: Object[] = this.StatementsAtLevel(
      StatementLevel.Top,
    );

    // Note we used to return null if there were any errors, but this would mean
    // that include files would return completely empty rather than attempting to
    // continue with errors. Returning an empty include files meant that anything
    // that *did* compile successfully would otherwise be ignored, generating way
    // more errors than necessary.
    return new Story(topLevelContent, this._rootParser !== this);
  };

  public readonly SeparatedList = <T extends ParseRule>(
    mainRule: SpecificParseRule<T>,
    separatorRule: ParseRule,
  ): ParseRuleReturn[] => {
    const firstElement: ParseRuleReturn = super.Parse(mainRule);
    if (firstElement === null) {
      return null;
    }

    const allElements = [];
    allElements.push(firstElement);

    do {
      const nextElementRuleId: number = this.BeginRule();
      var sep = separatorRule();
      if (sep === null) {
        this.FailRule(nextElementRuleId);
        break;
      }

      const nextElement = super.Parse(mainRule);
      if (nextElement === null) {
        this.FailRule(nextElementRuleId);
        break;
      }

      this.SucceedRule(nextElementRuleId);
      allElements.push(nextElement);
    } while (true);

    return allElements;
  };

  public readonly PreProcessInputString = (str: string): string => (
    new CommentEliminator(str).Process()
  );

  public readonly RuleDidSucceed = (
    result: ParseRuleReturn,
    stateAtStart: StringParserElement,
    stateAtEnd: StringParserElement,
  ): void => {
    // Apply DebugMetadata based on the state at the start of the rule
    // (i.e. use line number as it was at the start of the rule)
    const parsedObj = result as Object;
    if (parsedObj) {
      const md = new DebugMetadata();
      md.startLineNumber = stateAtStart.lineIndex + 1;
      md.endLineNumber = stateAtEnd.lineIndex + 1;
      md.fileName = this._filename;
      parsedObj.debugMetadata = md;

      return;
    }

    // A list of objects that doesn't already have metadata?
    const parsedListObjs: Object[] = result as Object[];
    if (parsedListObjs !== null) {
      for (const parsedListObj of parsedListObjs) {
        if (!parsedListObj.hasOwnDebugMetadata) {
          const md = new DebugMetadata();
          md.startLineNumber = stateAtStart.lineIndex + 1;
          md.endLineNumber = stateAtEnd.lineIndex + 1;
          md.fileName = this._filename;
          parsedListObj.debugMetadata = md;
        }
      }
    }
  };
      
  get parsingStringExpression(): boolean {
    return this.GetFlag(Number(CustomFlags.ParsingString));
  }

  set parsingStringExpression(value: boolean) {
    this.SetFlag(Number(CustomFlags.ParsingString), value);
  }

  public readonly OnError = (
    message: string,
    index: number,
    lineIndex: number,
    isWarning: boolean,
  ): void => {
    const warningType: string = isWarning ? 'WARNING:' : 'ERROR:';
    let fullMessage: string = warningType;

    if (this._filename !== null) {
      fullMessage += `'${this._filename}'`;      
    }

    fullMessage += `line ${lineIndex + 1}, index: ${index}: ${message}`;

    if (this._externalErrorHandler !== null) {
      this._externalErrorHandler(
        fullMessage,
        isWarning ? ErrorType.Warning : ErrorType.Error,
      );
    } else {
      throw new Error(fullMessage);
    }
  }

  public readonly AuthorWarning = (): AuthorWarning => {
    this.Whitespace();
  
    if (super.Parse(this.Identifier) !== 'TODO') {
      return null;
    }

    this.Whitespace();
    super.ParseString(':');
    this.Whitespace();
  
    const message = super.ParseUntilCharactersFromString ('\n\r');
  
    return new AuthorWarning(message);
  };

  /**
   * End base InkParser section.
   */  

  /**
   * Begin CharacterRanges section.
   */

  public static readonly LatinBasic: CharacterRange = CharacterRange.Define(
    '\u0041',
    '\u007A',
    new CharacterSet().AddRange('\u005B', '\u0060'),
  );

  public static readonly LatinExtendedA: CharacterRange = CharacterRange.Define(
    '\u0100',
    '\u017F',
    // no excludes here
  );

  public static readonly LatinExtendedB: CharacterRange = CharacterRange.Define(
    '\u0180',
    '\u024F',
    // no excludes here
  );

  public static readonly Greek: CharacterRange = CharacterRange.Define(
    '\u0370',
    '\u03FF',
    new CharacterSet()
      .AddRange('\u0378','\u0385')
      .AddCharacters('\u0374\u0375\u0378\u0387\u038B\u038D\u03A2'),
  );

  public static readonly Cyrillic: CharacterRange = CharacterRange.Define(
    '\u0400',
    '\u04FF',
    new CharacterSet().AddRange('\u0482', '\u0489'),
  );

  public static readonly Armenian: CharacterRange = CharacterRange.Define(
    '\u0530',
    '\u058F',
    new CharacterSet()
      .AddCharacters('\u0530')
      .AddRange('\u0557', '\u0560')
      .AddRange('\u0588', '\u058E'),
  );

  public static readonly Hebrew: CharacterRange = CharacterRange.Define(
    '\u0590',
    '\u05FF',
    new CharacterSet(),
  );

  public static readonly Arabic: CharacterRange = CharacterRange.Define(
    '\u0600',
    '\u06FF',
    new CharacterSet(),
  );

  public static readonly Korean: CharacterRange = CharacterRange.Define(
    '\uAC00',
    '\uD7AF',
    new CharacterSet(),
  );

  private readonly ExtendIdentifierCharacterRanges = (
    identifierCharSet: CharacterSet,
  ): void => {
    const characterRanges = InkParser.ListAllCharacterRanges();
    for (const charRange of characterRanges) {
      identifierCharSet.AddCharacters(charRange.ToCharacterSet());
    }
  };

  /// <summary>
  /// Gets an array of <see cref="CharacterRange" /> representing all of the currently supported
  /// non-ASCII character ranges that can be used in identifier names.
  /// </summary>
  /// <returns>
  /// An array of <see cref="CharacterRange" /> representing all of the currently supported
  /// non-ASCII character ranges that can be used in identifier names.
  /// </returns>
  public static readonly ListAllCharacterRanges = (): CharacterRange[] => [
    InkParser.LatinBasic,
    InkParser.LatinExtendedA,
    InkParser.LatinExtendedB,
    InkParser.Arabic,
    InkParser.Armenian,
    InkParser.Cyrillic,
    InkParser.Greek,
    InkParser.Hebrew,
    InkParser.Korean,
  ];

  /**
   * End CharacterRanges section.
   */

  /**
   * Begin Choices section.
   */

  public _parsingChoice: boolean;

  public readonly Choice = (): Choice => {
    let onceOnlyChoice: boolean = true;
    let bullets = this.Interleave<string>(
      this.OptionalExclude(this.Whitespace),
      this.String('*'),
    );

    if (bullets === null) {
      bullets = this.Interleave<string>(
        this.OptionalExclude(this.Whitespace),
        this.String('+'),
      );

      if (bullets === null) {
        return null;
      }

      onceOnlyChoice = false;
    }
        
    // Optional name for the choice
    const optionalName: string = super.Parse(this.BracketedName) as string;

    this.Whitespace();

    // Optional condition for whether the choice should be shown to the player
    const conditionExpr: Expression = super.Parse(this.ChoiceCondition) as Expression;

    this.Whitespace();

    // Ordinarily we avoid parser state variables like these, since
    // nesting would require us to store them in a stack. But since you should
    // never be able to nest choices within choice content, it's fine here.
    if (this._parsingChoice) {
      throw new Error(
        'Already parsing a choice - shouldn\'t have nested choices',
      );
    }

    this._parsingChoice = true;

    let startContent: ContentList = null;
    const startTextAndLogic = super.Parse(this.MixedTextAndLogic) as Object[];
    if (startTextAndLogic !== null) {
      startContent = new ContentList(startTextAndLogic);
    }

    let optionOnlyContent: ContentList = null;
    let innerContent: ContentList = null;

    // Check for a the weave style format:
    //   * "Hello[."]," he said.
    const hasWeaveStyleInlineBrackets: boolean = super.ParseString('[') !== null;
    if (hasWeaveStyleInlineBrackets) {
      const optionOnlyTextAndLogic = super.Parse(
        this.MixedTextAndLogic,
      ) as Object[];

      if (optionOnlyTextAndLogic !== null) {
        optionOnlyContent = new ContentList(optionOnlyTextAndLogic);
      }

      this.Expect(this.String(']'), "closing ']' for weave-style option");

      let innerTextAndLogic = super.Parse(this.MixedTextAndLogic) as Object[];
      if (innerTextAndLogic !== null) {
        innerContent = new ContentList(innerTextAndLogic);
      }
    }

    this.Whitespace();

    // Finally, now we know we're at the end of the main choice body, parse
    // any diverts separately.
    const diverts: Object[] = super.Parse(this.MultiDivert) as Object[];

    this._parsingChoice = false;

    this.Whitespace();

      // Completely empty choice without even an empty divert?
    const emptyContent: boolean = !startContent &&
      !innerContent &&
      !optionOnlyContent;

    if (emptyContent && diverts === null) {
      this.Warning(
        'Choice is completely empty. Interpretting as a default fallback choice. Add a divert arrow to remove this warning: * ->',
      );
    }

    if (!startContent && hasWeaveStyleInlineBrackets && !optionOnlyContent) {
      // * [] some text
      this.Warning(
        'Blank choice - if you intended a default fallback choice, use the `* ->` syntax',
      );

      if (!innerContent) {
        innerContent = new ContentList();
      }

      const tags = super.Parse(this.Tags) as Object[];
      if (tags !== null) {
        innerContent.AddContent(tags);
      }

      // Normal diverts on the end of a choice - simply add to the normal content
      if (diverts !== null) {
        for (const divObj of diverts) {
          // may be TunnelOnwards
          const div = divObj as Divert; 

          // Empty divert serves no purpose other than to say
          // "this choice is intentionally left blank"
          // (as an invisible default choice)
          if (div && div.isEmpty) {
            continue;
          }

          innerContent.AddContent(divObj);
        }
      }

      // Terminate main content with a newline since this is the end of the line
      // Note that this will be redundant if the diverts above definitely take
      // the flow away permanently.
      innerContent.AddContent(new Text('\n'));

      const choice = new Choice(startContent, optionOnlyContent, innerContent);
      choice.name = optionalName;
      choice.indentationDepth = bullets.length;
      choice.hasWeaveStyleInlineBrackets = hasWeaveStyleInlineBrackets;
      choice.condition = conditionExpr;
      choice.onceOnly = onceOnlyChoice;
      choice.isInvisibleDefault = emptyContent;

      return choice;
    }
  };

  public readonly ChoiceCondition = (): Expression => {
    const conditions = this.Interleave<Expression>(
      this.ChoiceSingleCondition,
      this.ChoiceConditionsSpace,
    );

    if (conditions === null) {
      return null;
    } else if (conditions.length === 1) {
      return conditions[0];
    }
    
    return new MultipleConditionExpression(conditions);
  };

  public readonly ChoiceConditionsSpace = (): typeof ParseSuccess => {
    // Both optional
    // Newline includes initial end of line whitespace
    this.Newline(); 
    this.Whitespace();

    return ParseSuccess;
  };

  public readonly ChoiceSingleCondition = (): Expression => {
    if (super.ParseString('{') === null) {
      return null;
    }

    const condExpr = this.Expect(this.Expression, "choice condition inside { }") as Expression;

    this.DisallowIncrement(condExpr);
    this.Expect(this.String('}'), 'closing \'}\' for choice condition');

    return condExpr;
  };

  public readonly Gather = (): Gather => {
    const gatherDashCountObj: number = super.Parse(this.GatherDashes) as number;
    if (gatherDashCountObj === null) {
      return null;
    }

    const gatherDashCount: number = Number(gatherDashCountObj);

    // Optional name for the gather
    const optionalName: string = super.Parse(this.BracketedName) as string;

    const gather = new Gather(optionalName, gatherDashCount);

    // Optional newline before gather's content begins
    this.Newline();

    return gather;
  };

  public readonly GatherDashes = (): number => {
    this.Whitespace();

    let gatherDashCount: number = 0;
    while (this.ParseDashNotArrow() !== null) {
      gatherDashCount += 1;
      this.Whitespace();
    }

    if (gatherDashCount === 0) {
      return null;
    }

    return gatherDashCount as number;
  };

  public readonly ParseDashNotArrow = () => {
    const ruleId = this.BeginRule();

    if (super.ParseString('->') === null &&
      super.ParseSingleCharacter() === '-')
    {
      return this.SucceedRule(ruleId);
    }
    
    return this.FailRule(ruleId);
  };

  public readonly BracketedName = (): string => {
    if (super.ParseString('(') === null) {
      return null;
    }

    this.Whitespace();

    const name: string = super.Parse(this.Identifier) as string;
    if (name === null) {
      return null;
    }

    this.Whitespace();

    this.Expect(this.String(')'), 'closing \')\' for bracketed name');

    return name;
  };

  /**
   * End Choices section.
   */

  /**
   * Begin Conditional section.
   */

  public readonly InnerConditionalContent = (
    initialQueryExpression: Expression
  ): Conditional => {
    if (initialQueryExpression === undefined) {
      const initialQueryExpression = super.Parse(this.ConditionExpression);
      const conditional = super.Parse(() => (
        this.InnerConditionalContent(initialQueryExpression as Expression)
      )) as Conditional;

      if (conditional === null) {
        return null;
      }

      return conditional;
    }

    let alternatives: ConditionalSingleBranch[];
    const canBeInline: boolean = initialQueryExpression !== null;
    const isInline: boolean = super.Parse(this.Newline) === null;

    if (isInline && !canBeInline) {
      return null;
    }

    if (isInline) {
      // Inline innards
      alternatives = this.InlineConditionalBranches();
    } else {
      // Multiline innards
      alternatives = this.MultilineConditionalBranches()

      if (alternatives === null) {
        // Allow single piece of content within multi-line expression, e.g.:
        // { true: 
        //    Some content that isn't preceded by '-'
        // }
        if (initialQueryExpression) {
          let soleContent: Object[] = this.StatementsAtLevel(StatementLevel.InnerBlock);
          if (soleContent !== null) {
            const soleBranch = new ConditionalSingleBranch(soleContent);
            alternatives = [ soleBranch ];

            // Also allow a final "- else:" clause
            const elseBranch = super.Parse(this.SingleMultilineCondition) as ConditionalSingleBranch;
            if (elseBranch) {
              if (!elseBranch.isElse) {
                this.ErrorWithParsedObject(
                  'Expected an \'- else:\' clause here rather than an extra condition',
                  elseBranch,
                );

                elseBranch.isElse = true;
              }

              alternatives.push(elseBranch);
            }
          }
        }

        // Still null?
        if (alternatives === null) {
          return null;
        }
      } else if (alternatives.length === 1 &&
        alternatives[0].isElse &&
        initialQueryExpression)
      {
        // Empty true branch - didn't get parsed, but should insert one for semantic correctness,
        // and to make sure that any evaluation stack values get tidied up correctly.
        const emptyTrueBranch = new ConditionalSingleBranch(null);
        emptyTrueBranch.isTrueBranch = true;
        alternatives.unshift(emptyTrueBranch);
      }

      // Like a switch statement
      // { initialQueryExpression:
      //    ... match the expression
      // }
      if (initialQueryExpression) {
        let earlierBranchesHaveOwnExpression: boolean = false;
        for (let ii = 0; ii < alternatives.length; ++ii) {
          const branch = alternatives[ii];
          const isLast: boolean = ii === alternatives.length - 1;

          // Matching equality with initial query expression
          // We set this flag even for the "else" clause so that
          // it knows to tidy up the evaluation stack at the end

          // Match query
          if (branch.ownExpression) {
            branch.matchingEquality = true;
            earlierBranchesHaveOwnExpression = true;
          } else if (earlierBranchesHaveOwnExpression && isLast) {
            // Else (final branch)
            branch.matchingEquality = true;
            branch.isElse = true;
          } else {
            // Binary condition:
            // { trueOrFalse:
            //    - when true
            //    - when false
            // }
            if (!isLast && alternatives.length > 2) {
              this.ErrorWithParsedObject(
                'Only final branch can be an \'else\'. Did you miss a \':\'?',
                branch,
              );
            } else {
              if (ii === 0) {
                branch.isTrueBranch = true;
              } else {
                branch.isElse = true;
              }
            }
          }
        }
      } else {
        // No initial query, so just a multi-line conditional. e.g.:
        // {
        //   - x > 3:  greater than three
        //   - x == 3: equal to three
        //   - x < 3:  less than three
        // }
        
        for (let ii = 0; ii < alternatives.length; ++ii) {
          const alt = alternatives[ii];
          const isLast: boolean = ii === alternatives.length - 1;

          if (alt.ownExpression === null) {
            if (isLast) {
              alt.isElse = true;
            } else {
              if (alt.isElse) {
                // Do we ALSO have a valid "else" at the end? Let's report the error there.
                const finalClause = alternatives[alternatives.length - 1];
                if (finalClause.isElse) {
                  this.ErrorWithParsedObject(
                    'Multiple \'else\' cases. Can have a maximum of one, at the end.',
                    finalClause,
                  );
                } else {
                  this.ErrorWithParsedObject(
                    '\'else\' case in conditional should always be the final one',
                    alt,
                  );
                }
              } else {
                this.ErrorWithParsedObject(
                  'Branch doesn\'t have condition. Are you missing a \':\'? ',
                  alt,
                );
              }
            }
          }
        }

        if (alternatives.length === 1 && alternatives[0].ownExpression === null) {
          this.ErrorWithParsedObject(
            'Condition block with no conditions',
            alternatives[0],
          );
        }
      }
    }

    // TODO: Come up with water-tight error conditions... it's quite a flexible system!
    // e.g.
    //   - inline conditionals must have exactly 1 or 2 alternatives
    //   - multiline expression shouldn't have mixed existence of branch-conditions?
    if (alternatives === null) {
      return null;
    }

    for (const branch of alternatives) {
      branch.isInline = isInline;
    }

    const cond = new Conditional(initialQueryExpression, alternatives);

    return cond;
  };

  public readonly InlineConditionalBranches = (): ConditionalSingleBranch[] => {
    const listOfLists = this.Interleave<Object[]>(
      this.MixedTextAndLogic,
      this.Exclude(this.String('|')),
      null,
      false,
    );

    if (listOfLists === null || listOfLists.length === 0) {
      return null;
    }

    const result: ConditionalSingleBranch[] = [];

    if (listOfLists.length > 2) {
      this.Error('Expected one or two alternatives separated by \'|\' in inline conditional');
    } else {
      const trueBranch = new ConditionalSingleBranch(listOfLists[0]);
      trueBranch.isTrueBranch = true;
      result.push(trueBranch);

      if (listOfLists.length > 1) {
        const elseBranch = new ConditionalSingleBranch(listOfLists[1]);
        elseBranch.isElse = true;
        result.push(elseBranch);
      }
    }

    return result;
  };

  public readonly MultilineConditionalBranches = (): ConditionalSingleBranch[] => {
    this.MultilineWhitespace();

    const multipleConditions = this.OneOrMore(this.SingleMultilineCondition);
    if (multipleConditions === null) {
      return null;
    }
    
    this.MultilineWhitespace();

    return multipleConditions as ConditionalSingleBranch[];
  };

  public readonly SingleMultilineCondition = (): ConditionalSingleBranch => {
    this.Whitespace();

    if (
      // Make sure we're not accidentally parsing a divert
      super.ParseString('->') !== null ||
      super.ParseString('-') === null
    ) {
      return null;
    }

    this.Whitespace();

    let expr: Expression = null;
    const isElse: boolean = super.Parse(this.ElseExpression) !== null;

    if (!isElse) {
      expr = super.Parse(this.ConditionExpression) as Expression;
    }

    let content: Object[] = this.StatementsAtLevel(StatementLevel.InnerBlock);
    if (expr === null && content === null) {
      this.Error('expected content for the conditional branch following \'-\'');

      // Recover
      content = [ new Text('') ];
    }

    // Allow additional multiline whitespace, if the statements were empty (valid)
    // then their surrounding multiline whitespacce needs to be handled manually.
    // e.g.
    // { x:
    //   - 1:    // intentionally left blank, but newline needs to be parsed
    //   - 2: etc
    // }
    this.MultilineWhitespace();

    const branch = new ConditionalSingleBranch(content);
    branch.ownExpression = expr;
    branch.isElse = isElse;

    return branch;
  };

  public readonly ConditionExpression = (): Object => {
    const expr = super.Parse(this.Expression) as Object;
    if (expr === null) {
      return null;
    }

    this.DisallowIncrement(expr);

    this.Whitespace();

    if (super.ParseString(':') === null) {
      return null;
    }

    return expr;
  };

  public readonly ElseExpression = (): typeof ParseSuccess => {
    if (super.ParseString('else') === null) {
      return null;
    }

    this.Whitespace();

    if (super.ParseString(':') === null) {
      return null;
    }

    return ParseSuccess;
  };

  /**
   * End Conditional section.
   */

  /**
   * Begin Content section.
   */

  public _nonTextPauseCharacters: CharacterSet;
  public _nonTextEndCharacters: CharacterSet;
  public _notTextEndCharactersChoice: CharacterSet;
  public _notTextEndCharactersString: CharacterSet;

  public readonly TrimEndWhitespace = (
    mixedTextAndLogicResults: Object[],
    terminateWithSpace: boolean,
  ): void => {
    // Trim whitespace from end
    if (mixedTextAndLogicResults.length > 0) {
      const lastObjIdx = mixedTextAndLogicResults.length - 1;
      const lastObj = mixedTextAndLogicResults[lastObjIdx];
      if (lastObj instanceof Text) {
        const textObj: Text = lastObj as Text;
        textObj.text = textObj.text.replace(new RegExp(/[ \t]+/g), ' ');

        if (terminateWithSpace) {
          textObj.text += ' ';
        } else if (textObj.text.length === 0) {
          // No content left at all? trim the whole object
          mixedTextAndLogicResults.splice(lastObjIdx, 1);

          // Recurse in case there's more whitespace
          this.TrimEndWhitespace(
            mixedTextAndLogicResults,
            false,
          );
        }
      }
    }
  };

  public readonly LineOfMixedTextAndLogic = (): Object[] => {
    // Consume any whitespace at the start of the line
    // (Except for escaped whitespace)
    super.Parse(this.Whitespace);

    let result: Object[] = super.Parse(
      this.MixedTextAndLogic,
    ) as Object[];

    // Terminating tag
    let onlyTags: boolean = false;
    const tags = super.Parse(this.Tags) as Object[];
    if (tags !== null) {
      if (result === null) {
        result = tags;
        onlyTags = true;
      } else {
        for (const tag of tags) {
          result.push(tag);
        }
      }
    }

    if (result === null || result.length === 0) {
      return null;
    }

    // Warn about accidentally writing "return" without "~"
    const firstText = result[0] as Text;
    if (firstText && firstText.text && firstText.text.startsWith('return')) {
      this.Warning(
        'Do you need a \'~\' before \'return\'? If not, perhaps use a glue: <> (since it\'s lowercase) or rewrite somehow?',
      );
    }

    if (result.length === 0) {
      return null;
    }

    const lastObj = result[result.length - 1];
    if (!(lastObj instanceof Divert)) {
      this.TrimEndWhitespace(result, false);
    }

    // Add newline since it's the end of the line
    // (so long as it's a line with only tags)
    if (!onlyTags) {
      result.push(new Text('\n'));
    }

    this.Expect(this.EndOfLine, 'end of line', this.SkipToNextLine);

    return result;
  };

  public readonly MixedTextAndLogic = (): Object[] => {
    // Check for disallowed "~" within this context
    const disallowedTilde = super.ParseObject(this.Spaced(this.String('~')));
    if (disallowedTilde !== null) {
        this.Error(
          'You shouldn\'t use a \'~\' here - tildas are for logic that\'s on its own line. To do inline logic, use { curly braces } instead',
        );
    }

    // Either, or both interleaved
    let results: Object[] = this.Interleave<Object>(
      this.Optional(this.ContentText),
      this.Optional(this.InlineLogicOrGlue),
    );

    // Terminating divert?
    // (When parsing content for the text of a choice, diverts aren't allowed.
    //  The divert on the end of the body of a choice is handled specially.)
    if (!this._parsingChoice) {
      const diverts: Object[] = super.Parse(this.MultiDivert) as Object[];
      if (diverts !== null) {
        // May not have had any results at all if there's *only* a divert!
        if (results === null) {
          results = [];
        }

        this.TrimEndWhitespace(
          results,
          true,
        );

        results.push(...diverts);
      }
    }

    if (results === null) {
      return null;
    }

    return results;
  };

  public readonly ContentText = (): Text => (
    this.ContentTextAllowingEscapeChar()
  );

  public readonly ContentTextAllowingEscapeChar = (): Text => {
    let sb: string = null;

    do {
      let str = super.Parse(this.ContentTextNoEscape);
      const gotEscapeChar: boolean = super.ParseString('\\') !== null;

      if (gotEscapeChar || str !== null ) {
        if (sb === null) {
          sb = '';
        }

        if (str !== null) {
          sb += String(str);
        }

        if (gotEscapeChar) {
          const c: string = super.ParseSingleCharacter();
          sb += c;
        }

      } else {
        break;
      }
    } while (true);

    if (sb !== null) {
      return new Text(sb);
    }

    return null;
  };

  // Content text is an unusual parse rule compared with most since it's
  // less about saying "this is is the small selection of stuff that we parse"
  // and more "we parse ANYTHING except this small selection of stuff".
  public readonly ContentTextNoEscape = (): string => {
    // Eat through text, pausing at the following characters, and
    // attempt to parse the nonTextRule.
    // "-": possible start of divert or start of gather
    // "<": possible start of glue
    if (this._nonTextPauseCharacters === null) {
      this._nonTextPauseCharacters = new CharacterSet('-<');
    }

    // If we hit any of these characters, we stop *immediately* without bothering to even check the nonTextRule
    // "{" for start of logic
    // "|" for mid logic branch
    if (this._nonTextEndCharacters === null) {
      this._nonTextEndCharacters = new CharacterSet('{}|\n\r\\#');
      this._notTextEndCharactersChoice = new CharacterSet(this._nonTextEndCharacters);
      this._notTextEndCharactersChoice.AddCharacters('[]');
      this._notTextEndCharactersString = new CharacterSet(this._nonTextEndCharacters);
      this._notTextEndCharactersString.AddCharacters('"');
    }

    // When the ParseUntil pauses, check these rules in case they evaluate successfully
    const nonTextRule: ParseRule = () => this.OneOf([
      this.ParseDivertArrow,
      this.ParseThreadArrow,
      this.EndOfLine,
      this.Glue,
    ]);

    let endChars: CharacterSet = null;
    if (this.parsingStringExpression) {
      endChars = this._notTextEndCharactersString;
    } else if (this._parsingChoice) {
      endChars = this._notTextEndCharactersChoice;
    } else {
      endChars = this._nonTextEndCharacters;
    }

    const pureTextContent: string = super.ParseUntil(
      nonTextRule,
      this._nonTextPauseCharacters,
      endChars,
    );

    if (pureTextContent !== null) {
      return pureTextContent;
    }

    return null;
  };

  /**
   * End Content section.
   */

  /**
   * Begin Divert section.
   */

  public readonly MultiDivert = (): Object[] => {
    this.Whitespace();

    let diverts: Object[] = null;

    // Try single thread first
    const threadDivert = super.Parse(this.StartThread) as Object;
    if (threadDivert) {
      diverts = [ threadDivert ];

      return diverts;
    }

    // Normal diverts and tunnels
    const arrowsAndDiverts = this.Interleave<Object> (
      this.ParseDivertArrowOrTunnelOnwards,
      this.DivertIdentifierWithArguments,
    );
    
    if (arrowsAndDiverts === null) {
      return null;
    }

    diverts = [];

    // Possible patterns:
    //  ->                   -- explicit gather
    //  ->->                 -- tunnel onwards
    //  -> div               -- normal divert
    //  ->-> div             -- tunnel onwards, followed by override divert
    //  -> div ->            -- normal tunnel
    //  -> div ->->          -- tunnel then tunnel continue
    //  -> div -> div        -- tunnel then divert
    //  -> div -> div ->     -- tunnel then tunnel
    //  -> div -> div ->->   
    //  -> div -> div ->-> div    (etc)

    // Look at the arrows and diverts
    for (let ii = 0; ii < arrowsAndDiverts.length; ++ii) {
      const isArrow: boolean = (ii % 2) === 0;

      // Arrow string
      if (isArrow) {
        // Tunnel onwards
        if (arrowsAndDiverts[ii] as any === '->->') {
          const tunnelOnwardsPlacementValid: boolean = (
            ii === 0 ||
            ii === arrowsAndDiverts.length - 1 ||
            ii === arrowsAndDiverts.length - 2
          );

          if (!tunnelOnwardsPlacementValid) {
            this.Error(
              'Tunnel onwards \'->->\' must only come at the begining or the start of a divert',
            );
          }

          const tunnelOnwards = new TunnelOnwards();
          if (ii < arrowsAndDiverts.length - 1) {
            const tunnelOnwardDivert = arrowsAndDiverts[ii + 1] as Divert;
            tunnelOnwards.divertAfter = tunnelOnwardDivert;
          }

          diverts.push(tunnelOnwards);

          // Not allowed to do anything after a tunnel onwards.
          // If we had anything left it would be caused in the above Error for
          // the positioning of a ->->
          break;
        }
      } else {
        // Divert
        const divert = arrowsAndDiverts[ii] as Divert;
        // More to come? (further arrows) Must be tunnelling.
        if (ii < arrowsAndDiverts.length - 1) {
          divert.isTunnel = true;
        }

        diverts.push(divert);
      }
    }

    // Single -> (used for default choices)
    if (diverts.length === 0 && arrowsAndDiverts.length === 1) {
      const gatherDivert = new Divert(null);
      gatherDivert.isEmpty = true;
      diverts.push(gatherDivert);

      if (!this._parsingChoice) {
        this.Error('Empty diverts (->) are only valid on choices');
      }
    }

    return diverts;
  };

  public readonly StartThread = (): Divert => {
    this.Whitespace();

    if (this.ParseThreadArrow() === null) {
      return null;
    }

    this.Whitespace();

    const divert = this.Expect(
      this.DivertIdentifierWithArguments,
      'target for new thread',
      () => new Divert(null),
    ) as Divert;

    divert.isThread = true;

    return divert;
  };

  public readonly DivertIdentifierWithArguments = (): Divert => {
    this.Whitespace();

    const targetComponents: string[] = super.Parse(
      this.DotSeparatedDivertPathComponents,
    ) as string[];

    if (targetComponents === null) {
      return null;
    }

    this.Whitespace();

    const optionalArguments = super.Parse(this.ExpressionFunctionCallArguments) as Expression[];

    this.Whitespace();

    const targetPath = new Path(targetComponents);

    return new Divert(targetPath, optionalArguments);
  };

  public readonly SingleDivert = (): Divert => {            
    const diverts = super.Parse(this.MultiDivert) as Object[];
    if (diverts === null) {
      return null;
    }

    // Ideally we'd report errors if we get the
    // wrong kind of divert, but unfortunately we
    // have to hack around the fact that sequences use
    // a very similar syntax.
    // i.e. if you have a multi-divert at the start
    // of a sequence, it initially tries to parse it
    // as a divert target (part of an expression of
    // a conditional) and gives errors. So instead
    // we just have to blindly reject it as a single
    // divert, and give a slightly less nice error
    // when you DO use a multi divert as a divert taret.

    if (diverts.length !== 1) {
      return null;
    }

    const singleDivert = diverts[0];
    if (singleDivert instanceof TunnelOnwards) {
      return null;
    }

    const divert = diverts[0] as Divert;
    if (divert.isTunnel) {
      return null;
    }

    return divert;
  };

  public readonly DotSeparatedDivertPathComponents = (): string[] => (
    this.Interleave<string>(
      this.Spaced(this.Identifier),
      this.Exclude(this.String('.')),
    )
  );

  public readonly ParseDivertArrowOrTunnelOnwards = (): string => {
    let numArrows: number = 0;
    while (super.ParseString('->') !== null) {
      numArrows += 1;
    }

    if (numArrows === 0) {
      return null;
    } else if (numArrows === 1) {
      return '->';
    } else if (numArrows === 2) {
      return "->->";
    }
    
    this.Error(
      'Unexpected number of arrows in divert. Should only have \'->\' or \'->->\'',
    );

    return '->->';
  };

  public readonly ParseDivertArrow = (): string => (
    super.ParseString('->')
  );

  public readonly ParseThreadArrow = (): string => (
    super.ParseString('<-')
  );

  /**
   * End Divert section.
   */

    /**
   * Begin Expressions section.
   */

  public _binaryOperators: InfixOperator[];
  public _maxBinaryOpLength: number;

  public readonly TempDeclarationOrAssignment = (): Object => {
    this.Whitespace();

    const isNewDeclaration: boolean = this.ParseTempKeyword();

    this.Whitespace();

    let varName: string = null;
    if (isNewDeclaration) {
      varName = this.Expect(this.Identifier, 'variable name') as string;
    } else {
      varName = super.Parse(this.Identifier) as string;
    }

    if (varName === null) {
      return null;
    }

    this.Whitespace();

    // += -=
    const isIncrement: boolean = super.ParseString('+') !== null;
    const isDecrement: boolean = super.ParseString('-') !== null;

    if (isIncrement && isDecrement) {
      this.Error('Unexpected sequence \'+-\'');
    }

    if (super.ParseString('=') === null) {
      // Definitely in an assignment expression?
      if (isNewDeclaration) {
        this.Error('Expected \'=\'');
      }

      return null;
    }

    const assignedExpression: Expression = this.Expect(
      this.Expression,
      'value expression to be assigned',
    ) as Expression;

    if (isIncrement || isDecrement) {
      const result = new IncDecExpression(varName, assignedExpression, isIncrement);
      return result;
    }
    
    const result = new VariableAssignment({
      variableName: varName,
      assignedExpression,
      isTemporaryNewDeclaration: isNewDeclaration,
    });

    return result;
  };

  public readonly DisallowIncrement = (expr: Object): void => {
    if (expr instanceof IncDecExpression) {
      this.Error(
        'Can\'t use increment/decrement here. It can only be used on a ~ line',
      );
    }
  };

  public readonly ParseTempKeyword = () => {
    const ruleId = this.BeginRule();

    if (super.Parse(this.Identifier) === 'temp') {
      this.SucceedRule(ruleId);
      return true;
    }
    
    this.FailRule(ruleId);
    return false;
  };
      
  public readonly ReturnStatement = (): ReturnType => {
    this.Whitespace();

    const returnOrDone = super.Parse(this.Identifier);
    if (returnOrDone !== 'return') {
      return null;
    }

    this.Whitespace();

    const expr = super.Parse(this.Expression) as Expression;

    const returnObj = new ReturnType(expr);

    return returnObj;
  };

  // Pratt Parser
  // aka "Top down operator precedence parser"
  // http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/
  // Algorithm overview:
  // The two types of precedence are handled in two different ways:
  //   ((((a . b) . c) . d) . e)			#1
  //   (a . (b . (c . (d . e))))			#2
  // Where #1 is automatically handled by successive loops within the main 'while' in this function,
  // so long as continuing operators have lower (or equal) precedence (e.g. imagine some series of "*"s then "+" above.
  // ...and #2 is handled by recursion of the right hand term in the binary expression parser.
  // (see link for advice on how to extend for postfix and mixfix operators)
  public readonly Expression = (
    minimumPrecedence: number = 0,
  ): Expression => {
    this.Whitespace();

    // First parse a unary expression e.g. "-a" or parethensised "(1 + 2)"
    let expr = this.ExpressionUnary();
    if (expr === null) {
      return null;
    }

    this.Whitespace();

    // Attempt to parse (possibly multiple) continuing infix expressions (e.g. 1 + 2 + 3)
    while (true) {
      const ruleId = this.BeginRule();

      // Operator
      const infixOp = this.ParseInfixOperator();
      if (infixOp !== null && infixOp.precedence > minimumPrecedence) {
        // Expect right hand side of operator
        const expectationMessage = `right side of '${infixOp.type}' expression`;
        const multiaryExpr = this.Expect(
          () => this.ExpressionInfixRight(expr, infixOp),
          expectationMessage,
        );

        if (multiaryExpr === null) {
          // Fail for operator and right-hand side of multiary expression
          this.FailRule(ruleId);

          return null;
        }

        expr = this.SucceedRule(ruleId, multiaryExpr) as Expression;

        continue;
      }

      this.FailRule(ruleId);
      break;
    }

    this.Whitespace();

    return expr;
  };

  public readonly ExpressionUnary = (): Expression => {
    // Divert target is a special case - it can't have any other operators
    // applied to it, and we also want to check for it first so that we don't
    // confuse "->" for subtraction.
    const divertTarget = super.Parse(this.ExpressionDivertTarget) as Expression;
    if (divertTarget !== null) {
      return divertTarget;
    }

    let prefixOp: Expression = this.OneOf([
      this.String('-'),
      this.String('!'),
    ]) as Expression;

    // Don't parse like the string rules above, in case its actually 
    // a variable that simply starts with "not", e.g. "notable".
    // This rule uses the Identifer rule, which will scan as much text
    // as possible before returning.
    if (prefixOp === null) {
      prefixOp = super.Parse(this.ExpressionNot) as Expression;
    }

    this.Whitespace();

    // - Since we allow numbers at the start of variable names, variable names are checked before literals
    // - Function calls before variable names in case we see parentheses
    let expr = this.OneOf([
      this.ExpressionList,
      this.ExpressionParen,
      this.ExpressionFunctionCall,
      this.ExpressionVariableName,
      this.ExpressionLiteral,
    ]) as Expression;

    // Only recurse immediately if we have one of the (usually optional) unary ops
    if (expr === null && prefixOp !== null) {
      expr = this.ExpressionUnary();
    }

    if (expr === null) {
      return null;
    } else if (prefixOp !== null) {
      expr = UnaryExpression.WithInner(expr, prefixOp as any) as Expression;
    }

    this.Whitespace();

    const postfixOp = this.OneOf([
      this.String('++'),
      this.String('--'),
    ]);

    if (postfixOp !== null) {
      const isInc: boolean = postfixOp === '++';

      if (!(expr instanceof VariableReference)) {
        this.Error(`can only increment and decrement variables, but saw '${expr}'.`);

        // Drop down and succeed without the increment after reporting error
      } else {
        const varRef = expr as VariableReference;
        expr = new IncDecExpression(varRef.name, isInc);
      }
    }

    return expr;
  };

  public readonly ExpressionNot = (): string => {
    const id = this.Identifier();
    if (id === 'not') {
      return id;
    }

    return null;
  };

  public readonly ExpressionLiteral = (): Expression => (
    this.OneOf([
      this.ExpressionFloat,
      this.ExpressionInt,
      this.ExpressionBool,
      this.ExpressionString,
    ]) as Expression
  );

  public readonly ExpressionDivertTarget = (): Expression => {
    this.Whitespace();

    const divert = super.Parse(this.SingleDivert) as Divert;
    if (divert === null || (divert && divert.isThread)) {
      return null;
    }

    this.Whitespace();

    return new DivertTarget(divert);
  };

  public readonly ExpressionInt = (): number => {
    const intOrNull: number = super.ParseInt();
    if (intOrNull === null) {
      return null;
    }

    return intOrNull;
  };

  public readonly ExpressionFloat = (): number => {
    const floatOrNull: number = super.ParseFloat();
    if (floatOrNull === null) {
      return null;
    }
    
    return floatOrNull;
  };

  public readonly ExpressionString = (): StringExpression => {
    const openQuote = super.ParseString('"');
    if (openQuote === null) {
      return null;
    }

    // Set custom parser state flag so that within the text parser,
    // it knows to treat the quote character (") as an end character
    this.parsingStringExpression = true;

    let textAndLogic: Object[] = super.Parse(this.MixedTextAndLogic) as Object[];

    this.Expect(
      this.String('"'),
      'close quote for string expression',
    );

    this.parsingStringExpression = false;

    if (textAndLogic === null) {
      textAndLogic = [ new Text('') ];
    } else if (textAndLogic.find((c) => c instanceof Divert)) {
      this.Error('String expressions cannot contain diverts (->)');
    }

    return new StringExpression(textAndLogic);
  };

  public readonly ExpressionBool = (): number => {
    const id = super.Parse(this.Identifier);
    if (id === 'true') {
      return 1;
    } else if (id === 'false') {
      return 0;
    }

    return null;
  };

  public readonly ExpressionFunctionCall = (): Expression => {
    const iden = super.Parse(this.Identifier);
    if (iden === null) {
      return null;
    }

    this.Whitespace();

    const args = super.Parse(this.ExpressionFunctionCallArguments);
    if (args === null) {
      return null;
    }

    return new FunctionCall(iden as string, args as any);
  };

  public readonly ExpressionFunctionCallArguments = (): Expression[] => {
    if (super.ParseString('(') === null) {
      return null;
    }

    // "Exclude" requires the rule to succeed, but causes actual comma string to be excluded from the list of results
    const commas: ParseRule = this.Exclude(this.String(','));
    let args = this.Interleave<Expression>(this.Expression, commas);
    if (args === null) {
      args = [];
    }

    this.Whitespace();

    this.Expect(this.String(')'), 'closing \')\' for function call');

    return args;
  };

  public readonly ExpressionVariableName = (): Expression => {
    const path = this.Interleave<string>(
      this.Identifier,
      this.Exclude(this.Spaced(this.String('.'))),
    );

    if (path === null || Story.IsReservedKeyword(path[0])) {
      return null;
    }

    return new VariableReference(path);
  };

  public readonly ExpressionParen = (): Expression => {
    if (super.ParseString('(') === null) {
      return null;
    }

    const innerExpr = super.Parse(this.Expression) as Expression;
    if (innerExpr === null) {
      return null;
    }

    this.Whitespace();

    this.Expect(
      this.String(')'),
      'closing parenthesis \')\' for expression',
    );

    return innerExpr;
  };

  public readonly ExpressionInfixRight = (
    left: Expression,
    op: InfixOperator,
  ) => {
    this.Whitespace();

    const right = super.Parse(() => this.Expression(op.precedence)) as Expression;
    if (right) {
      // We assume that the character we use for the operator's type is the same
      // as that used internally by e.g. Runtime.Expression.Add, Runtime.Expression.Multiply etc
      const expr = new BinaryExpression(left, right, op.type);
      return expr;
    }

    return null;
  };

  private readonly ParseInfixOperator = (): InfixOperator => {
    for (const op of this._binaryOperators) {
      const ruleId: number = this.BeginRule();

      if (super.ParseString(op.type) !== null) {
        if (op.requireWhitespace) {
          if (this.Whitespace() === null) {
            this.FailRule(ruleId);

            continue;
          }
        }

        return this.SucceedRule(ruleId, op) as InfixOperator;
      }

      this.FailRule(ruleId);
    }

    return null;
  };

  public readonly ExpressionList = (): string[] => {
    this.Whitespace();

    if (super.ParseString('(') === null) {
      return null;
    }

    this.Whitespace();

    // When list has:
    //  - 0 elements (null list) - this is okay, it's an empty list: "()"
    //  - 1 element - it could be confused for a single non-list related
    //    identifier expression in brackets, but this is a useless thing
    //    to do, so we reserve that syntax for a list with one item.
    //  - 2 or more elements - normal!
    const memberNames: string[] = this.SeparatedList(
      this.ListMember,
      this.Spaced(this.String(',')),
    ) as string[];

    this.Whitespace();

    // May have failed to parse the inner list - the parentheses may
    // be for a normal expression
    if (super.ParseString(')') === null) {
      return null;
    }

    return memberNames;
  };

  public readonly ListMember = (): string => {
    this.Whitespace();

    let name: string = super.Parse(this.Identifier) as string;
    if (name === null) {
      return null;
    }

    const dot = super.ParseString('.');
    if (dot !== null) {
      const name2: string = this.Expect(
        this.Identifier,
        `element name within the set ${name}`,
      ) as string;

      name += `.${name2}`;
    }

    this.Whitespace();

    return name;
  };

  public readonly RegisterExpressionOperators = () => {
    // These will be tried in order, so we need "<=" before "<"
    // for correctness

    this.RegisterBinaryOperator('&&', 1);
    this.RegisterBinaryOperator('||', 1);
    this.RegisterBinaryOperator('and', 1, true);
    this.RegisterBinaryOperator('or', 1, true);
    this.RegisterBinaryOperator('==', 2);
    this.RegisterBinaryOperator('>=', 2);
    this.RegisterBinaryOperator('<=', 2);
    this.RegisterBinaryOperator('<', 2);
    this.RegisterBinaryOperator('>', 2);
    this.RegisterBinaryOperator('!=', 2);

    // (apples, oranges) + cabbages has (oranges, cabbages) === true
    this.RegisterBinaryOperator('?', 3);
    this.RegisterBinaryOperator('has', 3, true);
    this.RegisterBinaryOperator('!?', 3);
    this.RegisterBinaryOperator('hasnt', 3, true);
    this.RegisterBinaryOperator('^', 3);

    this.RegisterBinaryOperator('+', 4);
    this.RegisterBinaryOperator('-', 5);
    this.RegisterBinaryOperator('*', 6);
    this.RegisterBinaryOperator('/', 7);

    this.RegisterBinaryOperator('%', 8);
    this.RegisterBinaryOperator('mod', 8, true);
  };

  public readonly RegisterBinaryOperator = (
    op: string,
    precedence: number,
    requireWhitespace: boolean = false,
  ): void => {
    const infix = new InfixOperator(op, precedence, requireWhitespace);
    this._binaryOperators.push(infix);
    this._maxBinaryOpLength = Math.max(this._maxBinaryOpLength, op.length);
  };

  /**
   * End Expressions section.
   */

  
  /**
   * Begin Include section.
   */
              
  private _rootParser: InkParser;
  private _openFilenames: string[];

  public readonly IncludeStatement = () => {
    this.Whitespace();

    if (this.ParseString ('INCLUDE') === null) {
      return null;
    }

    this.Whitespace();

    let filename: string = this.Expect(
      () => this.ParseUntilCharactersFromString('\n\r'),
      'filename for include statement',
    ) as string;

    filename = filename.replace(new RegExp(/[ \t]+$/g), '');

    // Working directory should already have been set up relative to the root ink file.
    const fullFilename = this._rootParser._fileHandler.ResolveInkFilename (filename);

    if (this.FilenameIsAlreadyOpen(fullFilename)) {
      this.Error(`Recursive INCLUDE detected: '${fullFilename}' is already open.`);
      this.ParseUntilCharactersFromString("\r\n");
      return new IncludedFile(null);
    } else {
      this.AddOpenFilename(fullFilename);
    }

    let includedStory: Story = null;
    let includedString: string = null;
    try {
      includedString = this._rootParser._fileHandler.LoadInkFileContents(
        fullFilename,
      );
    } catch (err) {
      this.Error(`Failed to load: '${filename}'.\nError:${err}`);
    }

    if (includedString !== null) {
      const parser: InkParser = new InkParser(
        includedString,
        filename,
        this._externalErrorHandler,
        this._rootParser,
      );

      includedStory = parser.Parse();
    }

    this.RemoveOpenFilename(fullFilename);

    // Return valid IncludedFile object even if there were errors when parsing.
    // We don't want to attempt to re-parse the include line as something else,
    // and we want to include the bits that *are* valid, so we don't generate
    // more errors than necessary.
    return new IncludedFile(includedStory);
  };

  public readonly FilenameIsAlreadyOpen = (fullFilename: string): boolean => (
    this._rootParser._openFilenames.includes(fullFilename)
  );

  public readonly AddOpenFilename = (fullFilename: string): void => {
    this._rootParser._openFilenames.push(fullFilename);
  };

  public readonly RemoveOpenFilename = (fullFilename: string) => {
    this._rootParser._openFilenames.splice(
      this._rootParser._openFilenames.indexOf(fullFilename),
      1,
    );
  };

  /**
   * End Include section.
   */

    /**
   * Begin Knot section.
   */

  public readonly KnotDefinition = (): Knot => {
    const knotDecl: FlowDecl = super.Parse(this.KnotDeclaration) as FlowDecl;
    if (knotDecl === null) {
      return null;
    }

    this.Expect(
      this.EndOfLine,
      'end of line after knot name definition',
      this.SkipToNextLine,
    );

    const innerKnotStatements: ParseRule = (): Object[] => (
      this.StatementsAtLevel(StatementLevel.Knot)
    );

    const content = this.Expect(
      innerKnotStatements,
      'at least one line within the knot',
      this.KnotStitchNoContentRecoveryRule,
    ) as Object[];

    return new Knot(
      knotDecl.name,
      content,
      knotDecl.args,
      knotDecl.isFunction,
    );
  };

  public readonly KnotDeclaration = (): FlowDecl => {
    this.Whitespace();

    if (this.KnotTitleEquals() === null) {
      return null;
    }

    this.Whitespace();

    const identifier: string = super.Parse(this.Identifier) as string;
    let knotName: string;

    const isFunc: boolean = identifier === 'function';
    if (isFunc) {
      this.Expect(
        this.Whitespace,
        'whitespace after the \'function\' keyword',
      );

      knotName = super.Parse(this.Identifier) as string;
    } else {
      knotName = identifier;
    }

    if (knotName === null) {
      this.Error(`Expected the name of the ${isFunc ? 'function' : 'knot'}`);
      knotName = ''; // prevent later null ref
    }

    this.Whitespace();

    const parameterNames: Argument[] = super.Parse(
      this.BracketedKnotDeclArguments,
    ) as Argument[];

    this.Whitespace();

    // Optional equals after name
    super.Parse(this.KnotTitleEquals);

    return new FlowDecl(
      knotName,
      parameterNames,
      isFunc,
    );
  };

  public readonly KnotTitleEquals = (): string => {
    // 2+ "=" starts a knot
    const multiEquals = this.ParseCharactersFromString('=');
    if (multiEquals === null || multiEquals.length <= 1) {
      return null;
    }

    return multiEquals;
  };

  public readonly StitchDefinition = (): ParseRuleReturn => {
    const decl = super.Parse(this.StitchDeclaration) as FlowDecl;
    if (decl === null) {
      return null;
    }

    this.Expect(
      this.EndOfLine,
      'end of line after stitch name',
      this.SkipToNextLine,
    );

    const innerStitchStatements: ParseRule = () => (
      this.StatementsAtLevel(StatementLevel.Stitch)
    );

    const content = this.Expect(
      innerStitchStatements,
      'at least one line within the stitch',
      this.KnotStitchNoContentRecoveryRule,
    ) as Object[];

    return new Stitch(decl.name, content, decl.args, decl.isFunction);
  };

  public readonly StitchDeclaration = (): FlowDecl => {
    this.Whitespace();

    // Single "=" to define a stitch
    if (this.ParseString('=') === null) {
      return null;
    }

    // If there's more than one "=", that's actually a knot definition (or divert), so this rule should fail
    if (this.ParseString('=') !== null) {
      return null;
    }

    this.Whitespace();

    // Stitches aren't allowed to be functions, but we parse it anyway and report the error later
    const isFunc: boolean = this.ParseString('function') !== null;
    if (isFunc) {
      this.Whitespace();
    }

    const stitchName: string = super.Parse(this.Identifier) as string;
    if (stitchName === null) {
      return null;
    }

    this.Whitespace();

    const flowArgs: Argument[] = super.Parse(
      this.BracketedKnotDeclArguments,
    ) as Argument[];

    this.Whitespace();

    return new FlowDecl(
      stitchName,
      flowArgs,
      isFunc,
    );
  };

  public readonly KnotStitchNoContentRecoveryRule = (): ParseRuleReturn => {
    // Jump ahead to the next knot or the end of the file
    this.ParseUntil(
      this.KnotDeclaration,
      new CharacterSet('='),
      null,
    );

    const recoveredFlowContent: Object[] = [ new Text('<ERROR IN FLOW>') ];

    return recoveredFlowContent;
  };

  public readonly BracketedKnotDeclArguments = (): Argument[] => {
    if (this.ParseString('(') === null) {
      return null;
    }

    let flowArguments = this.Interleave<Argument>(
      this.Spaced(this.FlowDeclArgument),
      this.Exclude(this.String(',')),
    );

    this.Expect(
      this.String(')'),
      'closing \')\' for parameter list',
    );

    // If no parameters, create an empty list so that this method is type safe and 
    // doesn't attempt to return the ParseSuccess object
    if (flowArguments === null) {
      flowArguments = [];
    }

    return flowArguments;
  };

  public readonly FlowDeclArgument = (): Argument => {
    // Possible forms:
    //  name
    //  -> name      (variable divert target argument
    //  ref name
    //  ref -> name  (variable divert target by reference)
    const firstIden = super.Parse(this.Identifier) as string;
    this.Whitespace();

    const divertArrow = this.ParseDivertArrow();

    this.Whitespace();

    const secondIden = super.Parse(this.Identifier) as string;

    if (firstIden == null && secondIden === null) {
      return null;
    }

    const flowArg = new Argument();
    if (divertArrow !== null) {
      flowArg.isDivertTarget = true;
    }

    // Passing by reference
    if (firstIden === 'ref') {
      if (secondIden === null) {
        this.Error('Expected an parameter name after \'ref\'');
      }

      flowArg.name = secondIden;
      flowArg.isByReference = true;
    } else {
      // Simple argument name
      if (flowArg.isDivertTarget) {
        flowArg.name = secondIden;
      } else {
        flowArg.name = firstIden;
      }

      if (flowArg.name === null) {
        this.Error('Expected an parameter name');
      }

      flowArg.isByReference = false;
    }

    return flowArg;
  };

  public readonly ExternalDeclaration = (): ExternalDeclaration => {
    this.Whitespace();

    const external: string = super.Parse(this.Identifier) as string;
    if (external != "EXTERNAL") {
      return null;
    }

    this.Whitespace();

    const funcName: string = this.Expect(
      this.Identifier,
      'name of external function',
    ) as string || '';

    this.Whitespace();

    let parameterNames = this.Expect(
      this.BracketedKnotDeclArguments,
      `declaration of arguments for EXTERNAL, even if empty, i.e. 'EXTERNAL ${funcName}()'`,
    ) as Argument[];

    if (parameterNames === null) {
      parameterNames = [];
    }

    const argNames = parameterNames.map(({ name }) => name);

    return new ExternalDeclaration(funcName, argNames);
  };

  /**
   * End Knot section.
   */


  /**
   * Start Logic section.
   */

  private _identifierCharSet: CharacterSet;

  get identifierCharSet(): CharacterSet {
    if (this._identifierCharSet === null) {
      (this._identifierCharSet = new CharacterSet())
        .AddRange ('A', 'Z')
        .AddRange ('a', 'z')
        .AddRange ('0', '9')
        .Add ('_');

      // Enable non-ASCII characters for story identifiers.
      this.ExtendIdentifierCharacterRanges(this._identifierCharSet);
    }

    return this._identifierCharSet;
  }

  public readonly LogicLine = (): Object => {
    this.Whitespace();

    if (this.ParseString('~') === null) {
      return null;
    }

    this.Whitespace();

    // Some example lines we need to be able to distinguish between:
    // ~ temp x = 5  -- var decl + assign
    // ~ temp x      -- var decl
    // ~ x = 5       -- var assign
    // ~ x           -- expr (not var decl or assign)
    // ~ f()         -- expr
    // We don't treat variable decl/assign as an expression since we don't want an assignment
    // to have a return value, or to be used in compound expressions.
    const afterTilde: ParseRule = () => this.OneOf([
      this.ReturnStatement,
      this.TempDeclarationOrAssignment,
      this.Expression,
    ]);

    let result = this.Expect(
      afterTilde,
      'expression after \'~\'',
      this.SkipToNextLine,
    ) as Object;

    // Prevent further errors, already reported expected expression and have skipped to next line.
    if (result === null) {
      return new ContentList();
    }

    // Parse all expressions, but tell the writer off if they did something useless like:
    //  ~ 5 + 4
    // And even:
    //  ~ false && myFunction()
    // ...since it's bad practice, and won't do what they expect if
    // they're expecting C's lazy evaluation.
    if (result instanceof Expression &&
      !(result instanceof FunctionCall || result instanceof IncDecExpression))
    {
      this.Error(
        'Logic following a \'~\' can\'t be that type of expression. It can only be something like:\n\t~ return\n\t~ var x = blah\n\t~ x++\n\t~ myFunction()',
      );
    }

    // Line is pure function call? e.g.
    //  ~ f()
    // Add extra pop to make sure we tidy up after ourselves.
    // We no longer need anything on the evaluation stack.
    const funCall = result as FunctionCall;
    if (funCall) {
      funCall.shouldPopReturnedValue = true;
    }

    // If the expression contains a function call, then it could produce a text side effect,
    // in which case it needs a newline on the end. e.g.
    //  ~ printMyName()
    //  ~ x = 1 + returnAValueAndAlsoPrintStuff()
    // If no text gets printed, then the extra newline will have to be culled later.
    // Multiple newlines on the output will be removed, so there will be no "leak" for
    // long running calculations. It's disappointingly messy though :-/
    if (result.Find<FunctionCall>() !== null) {
      result = new ContentList(result as any, new Text('\n'));
    }

    this.Expect(
      this.EndOfLine,
      'end of line',
      this.SkipToNextLine,
    );

    return result as Object;
  };

  public readonly VariableDeclaration = (): Object => {
    this.Whitespace();

    const id = super.Parse(this.Identifier);
    if (id !== 'VAR') {
      return null;
    }

    this.Whitespace();

    const varName = this.Expect(
      this.Identifier,
      'variable name',
    ) as string;

    this.Whitespace();

    this.Expect(
      this.String('='),
      'the \'=\' for an assignment of a value, e.g. \'= 5\' (initial values are mandatory)',
    );

    this.Whitespace ();

    const definition = this.Expect(this.Expression, 'initial value for ');

    const expr = definition as Expression;

    if (expr) {
      const check = typeof expr === 'number' ||
        expr instanceof StringExpression ||
        expr instanceof DivertTarget ||
        expr instanceof VariableReference ||
        expr instanceof List;

      if (!check) {
        this.Error('initial value for a variable must be a number, constant, list or divert target');
      }

      if (super.Parse(this.ListElementDefinitionSeparator) !== null) {
        this.Error('Unexpected \',\'. If you\'re trying to declare a new list, use the LIST keyword, not VAR');
      } else if (expr instanceof StringExpression) {
        // Ensure string expressions are simple
        const strExpr = expr as StringExpression;
        if (!strExpr.isSingleString) {
          this.Error('Constant strings cannot contain any logic.');
        }
      }

      const result = new VariableAssignment({
        assignedExpression: expr,
        isGlobalDeclaration: true,
        variableName: varName,
      });

      return result;
    }

    return null;
  };

  public readonly ListDeclaration = (): VariableAssignment => {
    this.Whitespace();

    const id = super.Parse(this.Identifier);
    if (id != 'LIST') {
      return null;
    }

    this.Whitespace();

    const varName = this.Expect(this.Identifier, 'list name') as string;

    this.Whitespace();

    this.Expect(
      this.String('='),
      'the \'=\' for an assignment of the list definition',
    );

    this.Whitespace();

    const definition = this.Expect(
      this.ListDefinition,
      'list item names',
    ) as ListDefinition;

    if (definition) {
      definition.name = varName;
      return new VariableAssignment({
        variableName: varName,
        listDef: definition,
      });
    }

    return null;
  };

  public readonly ListDefinition = (): ListDefinition => {
    this.AnyWhitespace();

    const allElements = this.SeparatedList(
      this.ListElementDefinition,
      this.ListElementDefinitionSeparator,
    ) as ListElementDefinition[];

    if (allElements === null) {
      return null;
    }

    return new ListDefinition(allElements);
  };

  public readonly ListElementDefinitionSeparator = (): string => {
    this.AnyWhitespace();

    if (this.ParseString(',') === null) {
      return null;
    }

    this.AnyWhitespace();

    return ',';
  };

  public readonly ListElementDefinition = () => {
    const inInitialList = this.ParseString('(') !== null;
    let needsToCloseParen = inInitialList;

    this.Whitespace();

    const name = super.Parse(this.Identifier) as string;
    if (name === null) {
      return null;
    }

    this.Whitespace();

    if (inInitialList) {
      if (this.ParseString(')') != null) {
        needsToCloseParen = false;
        this.Whitespace();
      }
    }

    let elementValue: number = null;
    if (this.ParseString('=') !== null) {
      this.Whitespace();

      const elementValueNum = this.Expect(
        this.ExpressionInt,
        'value to be assigned to list item',
      ) as number;

      if (elementValueNum !== null) {
        elementValue = elementValueNum;
      }

      if (needsToCloseParen) {
        this.Whitespace();

        if (this.ParseString(')') !== null) {
          needsToCloseParen = false;
        }
      }
    }

    if (needsToCloseParen) {
      this.Error('Expected closing \')\'');
    }

    return new ListElementDefinition(name, inInitialList, elementValue);
  };

  public readonly ConstDeclaration = (): Object => {
    this.Whitespace();

    const id = super.Parse(this.Identifier);
    if (id !== 'CONST') {
      return null;
    }

    this.Whitespace();

    const varName = this.Expect(
      this.Identifier,
      'constant name',
    ) as string;

    this.Whitespace();

    this.Expect(
      this.String('='),
      'the \'=\' for an assignment of a value, e.g. \'= 5\' (initial values are mandatory)',
    );

    this.Whitespace();

    const expr = this.Expect(this.Expression, 'initial value for ') as Expression;

    const check = typeof expr === 'number' ||
      expr instanceof DivertTarget ||
      expr instanceof StringExpression;

    if (!check) {
      this.Error('initial value for a constant must be a number or divert target');
    } else if (expr instanceof StringExpression) {
      // Ensure string expressions are simple
      const strExpr = expr as StringExpression;
      if (!strExpr.isSingleString) {
        this.Error('Constant strings cannot contain any logic.');
      }
    }

    const result = new ConstantDeclaration(varName, expr);

    return result;
  };

  public readonly InlineLogicOrGlue = (): Object => (
    this.OneOf([
      this.InlineLogic,
      this.Glue,
    ]) as Object
  );

  public readonly Glue = (): Glue => {
    // Don't want to parse whitespace, since it might be important
    // surrounding the glue.
    const glueStr = this.ParseString('<>');
    if (glueStr !== null) {
      return new Glue(new RuntimeGlue());
    }
    
    return null;
  };

  public readonly InlineLogic = () => {
    if (this.ParseString('{') === null) {
      return null;
    }

    this.Whitespace();

    const logic = this.Expect(
      this.InnerLogic,
      'some kind of logic, conditional or sequence within braces: { ... }',
    ) as Object;

    if (logic === null) {
      return null;
    }

    this.DisallowIncrement(logic);

    let contentList: ContentList = logic as any;
    if (!contentList) {
      contentList = new ContentList(logic as any);
    }

    this.Whitespace();

    this.Expect(
      this.String('}'),
      'closing brace \'}\' for inline logic',
    );

    return contentList;
  };

  public readonly InnerLogic = (): Object => {
    this.Whitespace();

    // Explicitly try the combinations of inner logic
    // that could potentially have conflicts first.

    // Explicit sequence annotation?
    const explicitSeqType: SequenceType = this.ParseObject(
      this.SequenceTypeAnnotation,
    ) as SequenceType;

    if (explicitSeqType !== null) {
      const contentLists = this.Expect(
        this.InnerSequenceObjects,
        'sequence elements (for cycle/stoping etc)',
      ) as ContentList[];

      if (contentLists === null) {
        return null;
      }

      return new Sequence(contentLists, explicitSeqType);
    }

    // Conditional with expression?
    const initialQueryExpression = super.Parse(this.ConditionExpression) as Expression;
    if (initialQueryExpression) {
      const conditional = this.Expect(
        () => this.InnerConditionalContent(initialQueryExpression),
        'conditional content following query',
      ) as Conditional;

      return conditional;
    }

    // Now try to evaluate each of the "full" rules in turn
    const rules: ParseRule[] = [
      // Conditional still necessary, since you can have a multi-line conditional
      // without an initial query expression:
      // {
      //   - true:  this is true
      //   - false: this is false
      // }
      this.InnerConditionalContent as ParseRule, 
      this.InnerSequence,
      this.InnerExpression,
    ];

    // Adapted from "OneOf" structuring rule except that in 
    // order for the rule to succeed, it has to maximally 
    // cover the entire string within the { }. Used to
    // differentiate between:
    //  {myVar}                 -- Expression (try first)
    //  {my content is jolly}   -- sequence with single element
    for (const rule of rules) {
      const ruleId: number = this.BeginRule();

      const result: Object = this.ParseObject(rule) as Object;
      if (result) {
        // Not yet at end?
        if (this.Peek(this.Spaced(this.String('}'))) === null) {
          this.FailRule(ruleId);
        } else {
          // Full parse of content within braces
          return this.SucceedRule(ruleId, result) as Object;
        }
      } else {
        this.FailRule(ruleId);
      }
    }

    return null;
  };

  public readonly InnerExpression = (): Object => {
    const expr = super.Parse(this.Expression) as Expression;
    if (expr) {
      expr.outputWhenComplete = true;
    }

    return expr;
  };

  // Note: we allow identifiers that start with a number,
  // but not if they *only* comprise numbers
  public readonly Identifier = (): string => {
    // Parse remaining characters (if any)
    const name = this.ParseCharactersFromCharSet(this.identifierCharSet);
    if (name === null) {
      return null;
    }

    // Reject if it's just a number
    let isNumberCharsOnly: boolean = true;
    for (let ii = 0, c = name[ii]; ii < name.length; ii += 1) {
      if (!(c >= '0' && c <= '9')) {
        isNumberCharsOnly = false;

        break;
      }
    }

    if (isNumberCharsOnly) {
      return null;
    }

    return name;
  };
  
  /**
   * End Logic section.
   */

    /**
   * Begin Sequences section.
   */

  public _sequenceTypeSymbols: CharacterSet = new CharacterSet('!&~$');

  public readonly InnerSequence = (): Sequence => {
    this.Whitespace();

    // Default sequence type
    let seqType: SequenceType = SequenceType.Stopping;

    // Optional explicit sequence type
    const parsedSeqType: SequenceType = super.Parse(
      this.SequenceTypeAnnotation,
    ) as SequenceType;

    if (parsedSeqType !== null) {
      seqType = parsedSeqType;
    }

    const contentLists = super.Parse(this.InnerSequenceObjects) as ContentList[];
    if (contentLists === null || contentLists.length <= 1) {
      return null;
    }

    return new Sequence(contentLists, seqType);
  };

  public readonly SequenceTypeAnnotation = (): ParseRuleReturn => {
    let annotation = super.Parse(this.SequenceTypeSymbolAnnotation) as SequenceType;

    if (annotation === null) {
      annotation = super.Parse(
        this.SequenceTypeWordAnnotation,
      ) as SequenceType;
    }

    if (annotation === null) {
      return null;
    }

    switch (annotation) {
      case SequenceType.Once:
      case SequenceType.Cycle:
      case SequenceType.Stopping:
      case SequenceType.Shuffle:
      case (SequenceType.Shuffle | SequenceType.Stopping):
      case (SequenceType.Shuffle | SequenceType.Once):
        break;
      default:
        this.Error(`Sequence type combination not supported: ${annotation}`);
        return SequenceType.Stopping;
    }

    return annotation;
  };

  public readonly SequenceTypeSymbolAnnotation = (): ParseRuleReturn => {
    if(this._sequenceTypeSymbols === null) {
      this._sequenceTypeSymbols = new CharacterSet('!&~$ ');
    }

    let sequenceType = 0 as SequenceType;
    const sequenceAnnotations = this.ParseCharactersFromCharSet(
      this._sequenceTypeSymbols,
    );

    if (sequenceAnnotations === null) {
      return null;
    }

    for (const symbolChar of sequenceAnnotations) {
      switch(symbolChar) {
        case '!':
          sequenceType |= SequenceType.Once;
          break;
        case '&':
          sequenceType |= SequenceType.Cycle;
          break;
        case '~':
          sequenceType |= SequenceType.Shuffle;
          break;
        case '$':
          sequenceType |= SequenceType.Stopping;
          break;
      }
    }

    if (sequenceType === 0 as SequenceType) {
      return null;
    }

    return sequenceType;
  };

  public readonly SequenceTypeWordAnnotation = (): ParseRuleReturn => {
    const sequenceTypes = this.Interleave<SequenceType | null>(
      this.SequenceTypeSingleWord,
      this.Exclude(this.Whitespace),
    );

    if (sequenceTypes === null || sequenceTypes.length === 0) {
      return null;
    }

    if (this.ParseString(':') === null) {
      return null;
    }

    let combinedSequenceType = 0 as SequenceType;
    for (const seqType of sequenceTypes) {
      combinedSequenceType |= seqType;
    }

    return combinedSequenceType;
  };

  public readonly SequenceTypeSingleWord = () => {
    let seqType: SequenceType | null = null;

    const word = super.Parse(this.Identifier);

    switch (word) {
      case 'once':
        seqType = SequenceType.Once;
        break;
      case 'cycle':
        seqType = SequenceType.Cycle;
        break;
      case 'shuffle':
        seqType = SequenceType.Shuffle;
        break;
      case 'stopping':
        seqType = SequenceType.Stopping;
        break;
    }

    if (seqType == null) {
      return null;
    }

    return seqType;
  };

  public readonly InnerSequenceObjects = (): ContentList[] => {
    const multiline = super.Parse(this.Newline) !== null;

    let result: ContentList[] | null = null;
    if (multiline) {
      result = super.Parse(this.InnerMultilineSequenceObjects) as ContentList[];
    } else {
      result = super.Parse(this.InnerInlineSequenceObjects) as ContentList[];
    }

    return result;
  };

  public readonly InnerInlineSequenceObjects = (): ContentList[] => {
    const interleavedContentAndPipes = this.Interleave<Object>(
      this.Optional(this.MixedTextAndLogic),
      this.String('|'),
      null,
      false,
    );

    if (interleavedContentAndPipes === null) {
      return null;
    }

    const result = [];

    // The content and pipes won't necessarily be perfectly interleaved in the sense that
    // the content can be missing, but in that case it's intended that there's blank content.
    let justHadContent: boolean = false;
    for (const contentOrPipe of interleavedContentAndPipes) {
      // Pipe/separator
      if (contentOrPipe as any === '|') {
        // Expected content, saw pipe - need blank content now
        if (!justHadContent) {
          // Add blank content
          result.push(new ContentList());
        }

        justHadContent = false;
      } else {
        // Real content
        const content = contentOrPipe as any;
        if (content === null) {
          this.Error(
            `Expected content, but got ${contentOrPipe} (this is an ink compiler bug!)`,
          );
        } else {
          result.push(new ContentList(content));
        }

        justHadContent = true;
      }
    }

    // Ended in a pipe? Need to insert final blank content
    if (!justHadContent) {
      result.push(new ContentList());
    }

    return result;
  };

  public readonly InnerMultilineSequenceObjects = (): ContentList[] => {
    this.MultilineWhitespace();

    const contentLists = this.OneOrMore(this.SingleMultilineSequenceElement) as ContentList[];
    if (contentLists === null) {
      return null;
    }

    return contentLists;
  }

  public readonly SingleMultilineSequenceElement = () => {
    this.Whitespace();

    // Make sure we're not accidentally parsing a divert
    if (this.ParseString('->') !== null) {
      return null;
    }

    if (this.ParseString('-') === null) {
      return null;
    }

    this.Whitespace();

    const content: Object[] = this.StatementsAtLevel(
      StatementLevel.InnerBlock,
    );

    if (content === null) {
      this.MultilineWhitespace();
    } else {
    // Add newline at the start of each branch
      content.unshift(new Text('\n'));
    }

    return new ContentList(content);
  };

  /**
   * End Sequences section.
   */

    /**
   * Begin Statements section.
   */

  private _statementRulesAtLevel: ParseRule[][];
  private  _statementBreakRulesAtLevel: ParseRule[][];

  public readonly StatementsAtLevel = (level: StatementLevel): Object[] => {
    // Check for error: Should not be allowed gather dashes within an inner block
    if (level === StatementLevel.InnerBlock) {
      const badGatherDashCount = super.Parse(this.GatherDashes) as Object;
      if (badGatherDashCount !== null) {
        this.Error(
          'You can\'t use a gather (the dashes) within the { curly braces } context. For multi-line sequences and conditions, you should only use one dash.',
        );
      }
    }
  
    return this.Interleave<Object>(
      this.Optional(this.MultilineWhitespace), 
      () => this.StatementAtLevel(level), 
      () => this.StatementsBreakForLevel(level),
    );
  };
            
  public readonly StatementAtLevel = (level: StatementLevel): Object => {
    const rulesAtLevel: ParseRule[] = this._statementRulesAtLevel[level as number];
    const statement = this.OneOf(rulesAtLevel) as ReturnType;

    // For some statements, allow them to parse, but create errors, since
    // writers may think they can use the statement, so it's useful to have 
    // the error message.
    if (level === StatementLevel.Top) {
      if (statement instanceof ReturnType) {
        this.Error('should not have return statement outside of a knot');
      }
    }

    return statement;
  };

  public readonly StatementsBreakForLevel = (level: StatementLevel): ParseRuleReturn => {
    this.Whitespace();

    const breakRules: ParseRule[] = this._statementBreakRulesAtLevel[level as number];
    const breakRuleResult = this.OneOf(breakRules);
    if (breakRuleResult === null) {
      return null;
    }

    return breakRuleResult;
  };

  public readonly GenerateStatementLevelRules = () => {
    const levels = self.Object.values(StatementLevel);

    this._statementRulesAtLevel = 'f'.repeat(levels.length)
      .split('f')
      .map(() => []);

    this._statementBreakRulesAtLevel = 'f'.repeat(levels.length)
      .split('f')
      .map(() => []);

    for (const level of levels) {
      const rulesAtLevel: ParseRule[] = [];
      const breakingRules: ParseRule[] = [];

      // Diverts can go anywhere
      rulesAtLevel.push(this.Line(this.MultiDivert));

      // Knots can only be parsed at Top/Global scope
      if (level >= StatementLevel.Top) {
        rulesAtLevel.push(this.KnotDefinition);
      }

      rulesAtLevel.push(this.Line(this.Choice));

      rulesAtLevel.push(this.Line(this.AuthorWarning));

      // Gather lines would be confused with multi-line block separators, like
      // within a multi-line if statement
      if (level > StatementLevel.InnerBlock) {
        rulesAtLevel.push(this.Gather);
      }

      // Stitches (and gathers) can (currently) only go in Knots and top level
      if (level >= StatementLevel.Knot) {
        rulesAtLevel.push(this.StitchDefinition);
      }

      // Global variable declarations can go anywhere
      rulesAtLevel.push(this.Line(this.ListDeclaration));
      rulesAtLevel.push(this.Line(this.VariableDeclaration));
      rulesAtLevel.push(this.Line(this.ConstDeclaration));
      rulesAtLevel.push(this.Line(this.ExternalDeclaration));

      // Global include can go anywhere
      rulesAtLevel.push(this.Line(this.IncludeStatement));

      // Normal logic / text can go anywhere
      rulesAtLevel.push(this.LogicLine);
      rulesAtLevel.push(this.LineOfMixedTextAndLogic);

      // --------
      // Breaking rules

      // Break current knot with a new knot
      if (level <= StatementLevel.Knot) {
        breakingRules.push(this.KnotDeclaration);
      }

      // Break current stitch with a new stitch
      if (level <= StatementLevel.Stitch) {
        breakingRules.push(this.StitchDeclaration);
      }

      // Breaking an inner block (like a multi-line condition statement)
      if (level <= StatementLevel.InnerBlock) {
        breakingRules.push(this.ParseDashNotArrow);
        breakingRules.push(this.String('}'));
      }

      this._statementRulesAtLevel[level as number] = rulesAtLevel;
      this._statementBreakRulesAtLevel [level as number] = breakingRules;
    }
  };

  public readonly SkipToNextLine = (): typeof ParseSuccess => {
    this.ParseUntilCharactersFromString('\n\r');
    this.ParseNewline();

    return ParseSuccess;
  };

  // Modifier to turn a rule into one that expects a newline on the end.
  // e.g. anywhere you can use "MixedTextAndLogic" as a rule, you can use 
  // "Line(MixedTextAndLogic)" to specify that it expects a newline afterwards.
  public readonly Line = (inlineRule: ParseRule): ParseRule => (
    () => {
      const result = this.ParseObject(inlineRule);
      if (result === null) {
        return null;
      }

      this.Expect(this.EndOfLine, 'end of line', this.SkipToNextLine);

      return result;
    }
  );

  /**
   * End Statements section.
   */

    /**
   * Begin Tags section.
   */

  private _endOfTagCharSet: CharacterSet = new CharacterSet('#\n\r\\');
  
  public readonly Tag = (): Tag => {
    this.Whitespace();

    if (this.ParseString('#') === null) {
      return null;
    }

    this.Whitespace();

    let sb = ''
    do {
      // Read up to another #, end of input or newline
      const tagText: string = this.ParseUntilCharactersFromCharSet(this._endOfTagCharSet);
      sb += tagText;

      // Escape character
      if (this.ParseString('\\') !== null) {
        const c: string = this.ParseSingleCharacter();
        if (c !== '\0') {
          sb += c;
        }

        continue;
      }

      break;
    } while (true);

    const fullTagText = sb.trim();

    return new Tag(new RuntimeTag(fullTagText));
  }

  public readonly Tags = (): Tag[] => {
    const tags = this.OneOrMore(this.Tag) as Tag[];
    if (tags === null) {
      return null;
    }

    return tags;
  };

  /**
   * End Tags section.
   */

  /**
   * Begin Whitespace section.
   */

  private _inlineWhitespaceChars: CharacterSet = new CharacterSet(' \t');

  // Handles both newline and endOfFile
  public readonly EndOfLine = () => (
    this.OneOf([
      this.Newline,
      this.EndOfFile,
    ])
  );

  // Allow whitespace before the actual newline
  public readonly Newline = (): typeof ParseSuccess | null => {
    this.Whitespace();

    const gotNewline: boolean = super.ParseNewline() !== null;

    // Optional \r, definite \n to support Windows (\r\n) and Mac/Unix (\n)

    if (!gotNewline) {
      return null;
    }

    return ParseSuccess;
  };

  public readonly EndOfFile = (): typeof ParseSuccess | null => {
    this.Whitespace();

    if (!this.endOfInput)
      return null;

    return ParseSuccess;
  };


  // General purpose space, returns N-count newlines (fails if no newlines)
  public readonly MultilineWhitespace = (): typeof ParseSuccess | null => {
    let newlines: ParseRuleReturn[] = this.OneOrMore(this.Newline);
    if (newlines === null) {
      return null;
    }

    // Use content field of Token to say how many newlines there were
    // (in most circumstances it's unimportant)
    const numNewlines: number = newlines.length;
    if (numNewlines >= 1) {
      return ParseSuccess;
    }

    return null;
  };

  public readonly Whitespace = (): typeof ParseSuccess | null => {
    const doneParsed = super.ParseCharactersFromCharSet(
      this._inlineWhitespaceChars,
    );

    if (doneParsed !== null) {
      return ParseSuccess;
    }

    return null;
  };

  public readonly Spaced = (rule: ParseRule): ParseRule => (
    () => {
      this.Whitespace();

      const result = super.ParseObject(rule);
      if (result === null) {
        return null;
      }

      this.Whitespace();

      return result;
    }
  );

  public readonly AnyWhitespace = (): typeof ParseSuccess | null => {
    let anyWhitespace: boolean = false;

    while (
      this.OneOf([
        this.Whitespace,
        this.MultilineWhitespace,
      ]) !== null)
    {
      anyWhitespace = true;
    }

    return anyWhitespace ? ParseSuccess : null;
  };

  public readonly MultiSpaced = (rule: ParseRule): ParseRuleReturn => (
    () => {
      this.AnyWhitespace();

      const result = super.ParseObject(rule);
      if (result === null) {
        return null;
      }

      this.AnyWhitespace();

      return result;
    }
  );

  /**
   * End Whitespace section.
   */
}
