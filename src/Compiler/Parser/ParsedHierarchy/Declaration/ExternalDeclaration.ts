import {
  INamedContent,
} from '../../../../INamedContent';
import {
  Object,
} from '../Object';
import {
  RuntimeObject,
} from '../../../../Runtime/Object';

export class ExternalDeclaration extends Object implements INamedContent {
  constructor (
    public readonly name: string,
    public readonly argumentNames: string[],
  )
  {
    super();
  }

  public readonly GenerateRuntimeObject = (): RuntimeObject | null => {
    this.story.AddExternal(this);

    // No runtime code exists for an external, only metadata
    return null;
  };
}

