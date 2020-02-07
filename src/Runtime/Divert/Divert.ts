import {
  RuntimeContainer,
} from '../Container';
import {
  RuntimeObject,
} from '../Object';
import {
  RuntimePath,
} from '../Path';
import {
  Pointer,
} from '../Pointer';
import {
  PushPopType,
} from '../PushPopType';

export class RuntimeDivert extends RuntimeObject {
  private _targetPath: RuntimePath | null = null;
  get targetPath(): RuntimePath | null { 
    // Resolve any relative paths to global ones as we come across them
    if (this._targetPath && this._targetPath.isRelative) {
      const targetObj = this.targetPointer ? this.targetPointer.Resolve() : null;
      if (targetObj) {
        this._targetPath = targetObj.path;
      }
    }

    return this._targetPath;
  }

  set targetPath(value: RuntimePath | null) {
    this._targetPath = value;
    this._targetPointer = Pointer.Null;
  } 

  private _targetPointer: Pointer | null = null;
  get targetPointer() {
    if (!this.targetPointer || !this.targetPath) {
      return null;
    } else if (this.targetPointer.isNull) {
      const targetObj = this.ResolvePath(this.targetPath).obj;

      if (this.targetPath.lastComponent && this.targetPath.lastComponent.isIndex) {
        this.targetPointer.container = targetObj.parent as RuntimeContainer;
        this.targetPointer.index = this.targetPath.lastComponent.index;
      } else {
        this._targetPointer = Pointer.StartOf(targetObj as RuntimeContainer);
      }
    }

    return this._targetPointer;
  }

  get targetPathString(): string | null {
    if (!this.targetPath) {
      return null;
    }

    return this.CompactPathString(this.targetPath);
  }

  set targetPathString(value: string | null) {
    if (value === null) {
      this.targetPath = null;
    } else {
      this.targetPath = new RuntimePath({ componentsString: value });
    }
  }
        
  public variableDivertName: string = '';
  get hasVariableTarget(): boolean {
    return Boolean(this.variableDivertName);
  }

  public pushesToStack: boolean;
  public stackPushType: PushPopType | null = null;

  public isExternal: boolean = false;
  public externalArgs: number = 0;
  public isConditional: boolean = false;

  constructor(stackPushType?: PushPopType) {
    super();

    if (stackPushType) {
      this.pushesToStack = true;
      this.stackPushType = stackPushType;
    } else {
      this.pushesToStack = false;
    }
  }

  public readonly Equals = (obj: any): boolean => {
    const otherDivert = obj as RuntimeDivert;
    if (otherDivert) {
      if (this.hasVariableTarget == otherDivert.hasVariableTarget) {
        if (this.hasVariableTarget) {
          return this.variableDivertName == otherDivert.variableDivertName;
        } else if (this.targetPath) {
          return this.targetPath.Equals(otherDivert.targetPath);
        }

      }
    }

    return false;
  };

  public readonly ToString = (): string => {
    if (this.hasVariableTarget) {
      return `Divert(variable: ${this.variableDivertName})`;
    } else if (!this.targetPath) {
      return 'Divert(null)';
    }

    let sb = '';

    let targetStr = this.targetPath.ToString();
    const targetLineNum = this.DebugLineNumberOfPath(this.targetPath);
    if (targetLineNum !== null && targetLineNum !== undefined) {
      targetStr = `line ${targetLineNum}`;
    }

    sb += 'Divert';

    if (this.isConditional) {
      sb += '?';
    }

    if (this.pushesToStack) {
      if (this.stackPushType === PushPopType.Function) {
        sb += ' function';
      } else {
        sb += ' tunnel';
      }
    }

    sb += ' -> ';
    sb += this.targetPathString;
    sb += ' (';
    sb += targetStr;
    sb += ')';

    return sb;
  };
}