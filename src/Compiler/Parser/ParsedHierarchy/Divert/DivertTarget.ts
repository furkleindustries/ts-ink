﻿import {
  BinaryExpression,
} from '../Expression/BinaryExpression';
import {
  Choice,
} from '../Choice';
import {
  Conditional,
} from '../Conditional/Conditional';
import {
  ConditionalSingleBranch,
} from '../Conditional/ConditionalSingleBranch';
import {
  RuntimeContainer,
} from '../../../../Runtime/Container';
import {
  Divert,
} from './Divert';
import {
  RuntimeDivert,
} from '../../../../Runtime/Divert/Divert';
import {
  DivertTargetValue,
} from '../../../../Runtime/Value/DivertTargetValue';
import {
  Expression,
} from '../Expression/Expression';
import {
  FlowBase,
} from '../Flow/FlowBase';
import {
  FunctionCall,
} from '../FunctionCall';
import {
  MultipleConditionExpression,
} from '../Expression/MultipleConditionExpression';
import {
  Story,
} from '../Story';
import {
  VariableReference,
} from '../Variable/VariableReference';

export class DivertTarget extends Expression {
  private _runtimeDivert: RuntimeDivert;
  private _runtimeDivertTargetValue: DivertTargetValue;

  public divert: Divert;

  constructor(divert: Divert) {
    super();

    this.divert = this.AddContent(divert);
  }

  public readonly GenerateIntoContainer = (
    container: RuntimeContainer,
  ): void => {
    this.divert.GenerateRuntimeObject();

    this._runtimeDivert = this.divert.runtimeDivert as RuntimeDivert;
    this._runtimeDivertTargetValue = new DivertTargetValue ();

    container.AddContent(this._runtimeDivertTargetValue);
  };

  public readonly ResolveReferences = (context: Story): void => {
    super.ResolveReferences(context);

    if (this.divert.isDone || this.divert.isEnd) {
      this.Error(
        `Can't use -> DONE or -> END as variable divert targets`,
        this,
      );

      return;
    }

    let usageContext: Object = this;
    while (usageContext && usageContext instanceof Expression) {
      let badUsage: boolean = false;
      let foundUsage: boolean = false;

      const usageParent = (usageContext as Expression).parent;
      if (usageParent instanceof BinaryExpression) {
        // Only allowed to compare for equality

        const binaryExprParent = usageParent as BinaryExpression;
        if (binaryExprParent.opName !== '==' &&
          binaryExprParent.opName !== '!=')
        {
          badUsage = true;
        } else {
          if (!(binaryExprParent.leftExpression instanceof DivertTarget ||
            binaryExprParent.leftExpression instanceof VariableReference))
          {
            badUsage = true;
          } else if (!(binaryExprParent.rightExpression instanceof DivertTarget ||
            binaryExprParent.rightExpression instanceof VariableReference))
          {
            badUsage = true;
          }
        }

        foundUsage = true;
      } else if (usageParent instanceof FunctionCall) {
        const funcCall = usageParent as FunctionCall;
        if (!funcCall.isTurnsSince && !funcCall.isReadCount) {
          badUsage = true;
        }

        foundUsage = true;
      } else if (usageParent instanceof Expression) {
        badUsage = true;
        foundUsage = true;
      } else if (usageParent instanceof MultipleConditionExpression) {
        badUsage = true;
        foundUsage = true;
      } else if (usageParent instanceof Choice &&
        (usageParent as Choice).condition === usageContext)
      {
        badUsage = true;
        foundUsage = true;
      } else if (usageParent instanceof Conditional ||
        usageParent instanceof ConditionalSingleBranch)
      {
        badUsage = true;
        foundUsage = true;
      }

      if (badUsage) {
        this.Error(
          `Can't use a divert target like that. Did you intend to call '${this.divert.target}' as a function: likeThis(), or check the read count: likeThis, with no arrows?`,
          this,
        );
      }

      if (foundUsage) {
        break;
      }

      usageContext = usageParent;
    }

    // Example ink for this case:
    //
    //     VAR x = -> blah
    //
    // ...which means that "blah" is expected to be a literal stitch target rather
    // than a variable name. We can't really intelligently recover from this (e.g. if blah happens to
    // contain a divert target itself) since really we should be generating a variable reference
    // rather than a concrete DivertTarget, so we list it as an error.
    if (this._runtimeDivert.hasVariableTarget) {
      this.Error(
        `Since '${this.divert.target.dotSeparatedComponents}' is a variable, it shouldn't be preceded by '->' here.`,
      );
    }

    // Main resolve
    this._runtimeDivertTargetValue.targetPath = this._runtimeDivert.targetPath;

    // Tell hard coded (yet variable) divert targets that they also need to be counted
    // TODO: Only detect DivertTargets that are values rather than being used directly for
    // read or turn counts. Should be able to detect this by looking for other uses of containerForCounting
    let targetContent = this.divert.targetContent;
    if (targetContent !== null ) {
      let target = targetContent.containerForCounting;
      if (target !== null) {
        // Purpose is known: used directly in TURNS_SINCE(-> divTarg)
        const parentFunc = this.parent as FunctionCall;
        if (parentFunc && parentFunc.isTurnsSince) {
          target.turnIndexShouldBeCounted = true;
        } else {
          // Unknown purpose, count everything
          target.visitsShouldBeCounted = true;
          target.turnIndexShouldBeCounted = true;
        }
      }

      // Unfortunately not possible:
      // https://github.com/inkle/ink/issues/538
      //
      // VAR func = -> double
      //
      // === function double(ref x)
      //    ~ x = x * 2
      //
      // Because when generating the parameters for a function
      // to be called, it needs to know ahead of time when
      // compiling whether to pass a variable reference or value.
      //
      var targetFlow = (targetContent as FlowBase);
      if (targetFlow != null && targetFlow.args !== null) {
        for (const arg of targetFlow.args) {
          if (arg.isByReference) {
            this.Error(
              `Can't store a divert target to a knot or function that has by-reference arguments ('${targetFlow.name}' has 'ref ${arg.name}').`,
            );
          }
        }
      }
    }
  };

  // Equals override necessary in order to check for CONST multiple definition equality
  public readonly Equals = (obj: Object): boolean => {
    const otherDivTarget = obj as DivertTarget;
    if (otherDivTarget === null) {
      return false;
    }

    const targetStr = this.divert.target.dotSeparatedComponents;
    const otherTargetStr = otherDivTarget.divert.target.dotSeparatedComponents;

    return targetStr === otherTargetStr;
  };
}

