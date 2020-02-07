import {
  RuntimeContainer,
} from '../Container';
import {
  RuntimeObject,
} from '../Object';
import {
  RuntimePath,
} from '../Path';

/// <summary>
/// The ChoicePoint represents the point within the Story where
/// a Choice instance gets generated. The distinction is made
/// because the text of the Choice can be dynamically generated.
/// </summary>
export class ChoicePoint extends RuntimeObject {
  private _pathOnChoice: RuntimePath | null = null;

  get pathOnChoice(): RuntimePath | null {
    // Resolve any relative paths to global ones as we come across them
    if (this._pathOnChoice && this._pathOnChoice.isRelative) {
      const choiceTargetObj = this.choiceTarget;
      if (choiceTargetObj) {
        this._pathOnChoice = choiceTargetObj.path;
      }
    }

    return this._pathOnChoice;
  }

  set pathOnChoice(value: RuntimePath | null) {
    this._pathOnChoice = value;
  }


  get choiceTarget(): RuntimeContainer | null {
    if (!this.pathOnChoice) {
      return null;
    }

    return this.ResolvePath(this.pathOnChoice).container;
  }

  get pathStringOnChoice(): string | null  {
    if (!this.pathOnChoice) {
      return null;
    }

    return this.CompactPathString(this.pathOnChoice);
  }

  set pathStringOnChoice(value: string | null) {
    if (value) {
      this.pathOnChoice = new RuntimePath({ componentsString: value });
    }
  }

  public hasCondition: boolean = false;
  public hasStartContent: boolean = false;
  public hasChoiceOnlyContent: boolean = false;
  public isInvisibleDefault: boolean = false;

  get flags(): number {
    let flags = 0;

    if (this.hasCondition) {
      flags |= 1;
    }

    if (this.hasStartContent) {
      flags |= 2;
    }

    if (this.hasChoiceOnlyContent) {
      flags |= 4;
    }

    if (this.isInvisibleDefault) {
      flags |= 8;
    }

    if (this.onceOnly) {
      flags |= 16;
    }

    return flags;
  }

  set flags(value: number) {
    this.hasCondition = (value & 1) > 0;
    this.hasStartContent = (value & 2) > 0;
    this.hasChoiceOnlyContent = (value & 4) > 0;
    this.isInvisibleDefault = (value & 8) > 0;
    this.onceOnly = (value & 16) > 0;
  }

  constructor(public onceOnly = true) {
    super();
  }

  public readonly ToString = (): string => {
    const targetLineNum: number = this.DebugLineNumberOfPath(
      this.pathOnChoice,
    ) || -1;

    let targetString = this.pathOnChoice ?
      this.pathOnChoice.ToString() :
      'NO CHOICE PATH FOUND';

    if (targetLineNum !== null && targetLineNum !== undefined) {
      targetString = ` line ${targetLineNum}(${targetString})`;
    } 

    return `Choice: -> ${targetString}`;
  };
}

