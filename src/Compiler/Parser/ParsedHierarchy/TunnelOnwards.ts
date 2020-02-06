import {
  CommandType,
} from '../../../Runtime/CommandType';
import {
  RuntimeContainer,
} from '../../../Runtime/Container';
import {
  RuntimeControlCommand,
} from '../../../Runtime/ControlCommand';
import {
  Divert,
} from './Divert/Divert';
import {
  DivertTargetValue,
} from '../../../Runtime/Value/DivertTargetValue';
import {
  Object,
} from './Object';
import {
  RuntimeObject,
} from '../../../Runtime/Object';
import {
  Story,
} from './Story';
import {
  Void,
} from '../../../Runtime/Void';

export class TunnelOnwards extends Object {
  private _overrideDivertTarget: DivertTargetValue;

  private _divertAfter: Divert;
  get divertAfter(): Divert {
    return this._divertAfter;
  };

  set divertAfter(value: Divert) {
    this._divertAfter = value;
    if (this._divertAfter) {
      this.AddContent(this._divertAfter);
    }
  }

  public readonly GenerateRuntimeObject = (): RuntimeObject => {
    const container = new RuntimeContainer();

    // Set override path for tunnel onwards (or nothing)
    container.AddContent(RuntimeControlCommand.EvalStart());

    if (this.divertAfter) {
      // Generate runtime object's generated code and steal the arguments runtime code
      const returnRuntimeObj = this.divertAfter.GenerateRuntimeObject();
      const returnRuntimeContainer = returnRuntimeObj as RuntimeContainer;
      if (returnRuntimeContainer) {
        // Steal all code for generating arguments from the divert
        const args = this.divertAfter.args;
        if (args !== null && args.length > 0) {
          // Steal everything betwen eval start and eval end
          let evalStart = -1;
          let evalEnd = -1;
          for (let ii = 0; ii < returnRuntimeContainer.content.length; ii += 1) {
            const cmd = returnRuntimeContainer.content[ii] as RuntimeControlCommand;
            if (cmd) {
              if (evalStart == -1 &&
                cmd.commandType === CommandType.EvalStart)
              {
                evalStart = ii;
              } else if (cmd.commandType === CommandType.EvalEnd) {
                evalEnd = ii;
              }
            }
          }

          for (let ii = evalStart + 1; ii < evalEnd; ii += 1) {
            const obj = returnRuntimeContainer.content[ii];
            obj.parent = null; // prevent error of being moved between owners
            container.AddContent(returnRuntimeContainer.content[ii]);
          }
        }
      }

      // Finally, divert to the requested target 
      this._overrideDivertTarget = new DivertTargetValue();
      container.AddContent(this._overrideDivertTarget);
    } else {
      // No divert after tunnel onwards
      container.AddContent(new Void());
    }

    container.AddContent(RuntimeControlCommand.EvalEnd());
    container.AddContent(RuntimeControlCommand.PopTunnel());

    return container;
  };

  public readonly ResolveReferences = (context: Story): void => {
    super.ResolveReferences(context);

    if (this.divertAfter && this.divertAfter.targetContent) {
      this._overrideDivertTarget.targetPath = this.divertAfter.targetContent.runtimePath;
    }
  };
}

