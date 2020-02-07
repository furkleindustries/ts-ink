import {
  RuntimeContainer,
} from '../../../../Runtime/Container';
import {
  INamedContent,
} from '../../../../INamedContent';
import {
  IWeavePoint,
} from '../IWeavePoint';
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

export class Gather extends Object implements INamedContent, IWeavePoint {
  public readonly name: string = '';

  get runtimeContainer(): RuntimeContainer {
    return this.runtimeObject as RuntimeContainer; 
  }

  constructor(
    name: string | null,
    public readonly indentationDepth: number,
  ) {
    super();

    if (name) {
      this.name = name;
    }
  }
      
  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    const container = new RuntimeContainer();
    container.name = this.name;

    if (this.story.countAllVisits) {
      container.visitsShouldBeCounted = true;
    }

    container.countingAtStartOnly = true;

    // A gather can have null content, e.g. it's just purely a line with "-"
    if (this.content) {
      for (const c of this.content) {
        container.AddContent(c.runtimeObject);
      }
    }

    return container;
  };

  public readonly ResolveReferences = (context: Story): void => {
    super.ResolveReferences(context);

    if (this.name !== null && this.name.length > 0) {
      context.CheckForNamingCollisions(
        this,
        this.name,
        SymbolType.SubFlowAndWeave,
      );
    }
  };
}

