import {
  ListDefinition,
} from './ListDefinition';
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

export class ListElementDefinition extends Object {
  public seriesValue: number = 0;
  get parent(): ListDefinition {
    return super.parent as ListDefinition;
  }

  get fullName(): string {
    const parentList = this.parent;
    if (parentList === null) {
      throw new Error('Can\'t get full name without a parent list.');
    }

    return `${parentList.name}.${name}`;
  }

  get typeName(): string {
    return 'List element';
  }

  constructor(
    public readonly name: string,
    public readonly inInitialList: boolean,
    public readonly explicitValue: number | null = null,
  ) {
    super();
  }

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    throw new Error('Not implemented.');
  };

  public readonly ResolveReferences = (context: Story): void => {
    super.ResolveReferences(context);
    context.CheckForNamingCollisions(this, this.name, SymbolType.ListItem);
  };
}