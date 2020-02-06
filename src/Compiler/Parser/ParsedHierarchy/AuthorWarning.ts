import {
  Object,
} from './Object';

export class AuthorWarning extends Object {
  constructor(public readonly warningMessage: string) {
    super();
  }

  public readonly GenerateRuntimeObject = (): null => {
    this.Warning(this.warningMessage);
    return null;
  };
}

