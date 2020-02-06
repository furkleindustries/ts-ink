import {
  Expression,
} from '../Expression/Expression';
import {
  Object,
} from '../Object';
import {
  RuntimeObject,
} from '../../../../Runtime/Object';
import {
  Story,
} from '../Story';
import {
  SymbolType,
} from '../SymbolType';

export class ConstantDeclaration extends Object {
  public readonly expression: Expression;

  constructor(
    public readonly constantName: string,
    assignedExpression: Expression,
  ) {
    super();

    // Defensive programming in case parsing of assignedExpression failed
    if (assignedExpression) {
      this.expression = this.AddContent(assignedExpression);
    }
  }

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    // Global declarations don't generate actual procedural
    // runtime objects, but instead add a global variable to the story itself.
    // The story then initialises them all in one go at the start of the game.
    return null;
  };

  public ResolveReferences = (context: Story) => {
    this.ResolveReferences(context);
    context.CheckForNamingCollisions(
      this,
      this.constantName,
      SymbolType.Var
    );
  };

  get typeName() {
    return 'Constant';
  }
}

