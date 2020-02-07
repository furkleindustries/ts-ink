import {
  RuntimeObject,
} from '../Object';

// The value to be assigned is popped off the evaluation stack, so no need to keep it here
export class RuntimeVariableAssignment extends RuntimeObject {
  constructor(
    public readonly variableName: string,
    public readonly isNewDeclaration: boolean = false,
    public isGlobal: boolean = false
  ) {
    super();
  }

  public readonly ToString = (): string => (
    `VarAssign to ${this.variableName}`
  );
}
