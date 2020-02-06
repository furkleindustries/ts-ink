import { RuntimeControlCommand, } from '../../../Runtime/ControlCommand';
import { Divert, } from './Divert/Divert';
import { Expression, } from './Expression/Expression';
import { RuntimeInkList, } from '../../../Runtime/List/InkList';
import { ListValue, } from '../../../Runtime/Value/ListValue';
import { NativeFunctionCall, } from '../../../Runtime/NativeFunctionCall';
import { NumberType, } from './NumberType';
import { Path, } from './Path';
import { StringValue, } from '../../../Runtime/Value/StringValue';
export class FunctionCall extends Expression {
    constructor(functionName, args) {
        super();
        this.GenerateIntoContainer = (container) => {
            const foundList = this.story.ResolveList(name);
            let usingProxyDivert = false;
            if (this.isChoiceCount) {
                if (this.args.length > 0) {
                    this.Error('The CHOICE_COUNT() function shouldn\'t take any arguments');
                }
                container.AddContent(RuntimeControlCommand.ChoiceCount());
            }
            else if (this.isTurns) {
                if (this.args.length > 0) {
                    this.Error('The TURNS() function shouldn\'t take any arguments');
                }
                container.AddContent(RuntimeControlCommand.Turns());
            }
            else if (this.isTurnsSince || this.isReadCount) {
                const divertTarget = this.args[0];
                const variableDivertTarget = this.args[0];
                if (this.args.length !== 1 ||
                    (divertTarget === null && variableDivertTarget === null)) {
                    this.Error(`The ${name}() function should take one argument: a divert target to the target knot, stitch, gather or choice you want to check. e.g. TURNS_SINCE(-> myKnot)`);
                    return;
                }
                if (divertTarget) {
                    this._divertTargetToCount = divertTarget;
                    this.AddContent(this._divertTargetToCount);
                    this._divertTargetToCount.GenerateIntoContainer(container);
                }
                else {
                    this._variableReferenceToCount = variableDivertTarget;
                    this.AddContent(this._variableReferenceToCount);
                    this._variableReferenceToCount.GenerateIntoContainer(container);
                }
                if (this.isTurnsSince) {
                    container.AddContent(RuntimeControlCommand.TurnsSince());
                }
                else {
                    container.AddContent(RuntimeControlCommand.ReadCount());
                }
            }
            else if (this.isRandom) {
                if (this.args.length !== 2) {
                    this.Error('RANDOM should take 2 parameters: a minimum and a maximum integer');
                }
                // We can type check single values, but not complex expressions
                for (let ii = 0; ii < this.args.length; ii += 1) {
                    const num = this.args[ii];
                    if (this.args[ii] instanceof NumberType) {
                        if (Number.isNaN(num.value) || num.value % 1 !== 0) {
                            const paramName = ii === 0 ? 'minimum' : 'maximum';
                            this.Error(`RANDOM's ${paramName} parameter should be an integer`);
                        }
                    }
                    this.args[ii].GenerateIntoContainer(container);
                }
                container.AddContent(RuntimeControlCommand.Random());
            }
            else if (this.isSeedRandom) {
                if (this.args.length !== 1) {
                    this.Error('SEED_RANDOM should take 1 parameter - an integer seed');
                }
                const num = this.args[0];
                if (num &&
                    typeof num.value !== 'number' ||
                    Number.isNaN(num.value) ||
                    num.value % 1 !== 0) {
                    this.Error('SEED_RANDOM\'s parameter should be an integer seed');
                }
                this.args[0].GenerateIntoContainer(container);
                container.AddContent(RuntimeControlCommand.SeedRandom());
            }
            else if (this.isListRange) {
                if (this.args.length !== 3) {
                    this.Error('LIST_RANGE should take 3 parameters - a list, a min and a max');
                }
                for (let ii = 0; ii < this.args.length; ii += 1) {
                    this.args[ii].GenerateIntoContainer(container);
                }
                container.AddContent(RuntimeControlCommand.ListRange());
            }
            else if (this.isListRandom) {
                if (this.args.length !== 1) {
                    this.Error('LIST_RANDOM should take 1 parameter - a list');
                }
                this.args[0].GenerateIntoContainer(container);
                container.AddContent(RuntimeControlCommand.ListRandom());
            }
            else if (NativeFunctionCall.CallExistsWithName(name)) {
                const nativeCall = NativeFunctionCall.CallWithName(name);
                if (nativeCall.numberOfParameters !== this.args.length) {
                    let msg = `${name} should take ${nativeCall.numberOfParameters} parameter`;
                    if (nativeCall.numberOfParameters > 1) {
                        msg += 's';
                    }
                    this.Error(msg);
                }
                for (let ii = 0; ii < this.args.length; ii += 1) {
                    this.args[ii].GenerateIntoContainer(container);
                }
                container.AddContent(NativeFunctionCall.CallWithName(name));
            }
            else if (foundList !== null) {
                if (this.args.length > 1) {
                    this.Error('Can currently only construct a list from one integer (or an empty list from a given list definition)');
                }
                // List item from given int
                if (this.args.length === 1) {
                    container.AddContent(new StringValue(name));
                    this.args[0].GenerateIntoContainer(container);
                    container.AddContent(RuntimeControlCommand.ListFromInt());
                }
                else {
                    // Empty list with given origin.
                    const list = new RuntimeInkList();
                    list.SetInitialOriginName(name);
                    container.AddContent(new ListValue({ list }));
                }
            }
            else {
                // Normal function call
                container.AddContent(this._proxyDivert.runtimeObject);
                usingProxyDivert = true;
            }
            // Don't attempt to resolve as a divert if we're not doing a normal function call
            if (!usingProxyDivert) {
                this.content.splice(this.content.indexOf(this._proxyDivert, 1));
            }
            // Function calls that are used alone on a tilda-based line:
            //  ~ func()
            // Should tidy up any returned value from the evaluation stack,
            // since it's unused.
            if (this.shouldPopReturnedValue) {
                container.AddContent(RuntimeControlCommand.PopEvaluatedValue());
            }
        };
        this.ResolveReferences = (context) => {
            super.ResolveReferences(context);
            // If we aren't using the proxy divert after all (e.g. if 
            // it's a native function call), but we still have arguments,
            // we need to make sure they get resolved since the proxy divert
            // is no longer in the content array.
            if (!this.content.includes(this._proxyDivert) && this.args !== null) {
                for (const arg of this.args) {
                    arg.ResolveReferences(context);
                }
            }
            if (this._divertTargetToCount) {
                const divert = this._divertTargetToCount.divert;
                const attemptingTurnCountOfVariableTarget = divert.runtimeDivert.variableDivertName != null;
                if (attemptingTurnCountOfVariableTarget) {
                    this.Error(`When getting the TURNS_SINCE() of a variable target, remove the '->' - i.e. it should just be TURNS_SINCE(${divert.runtimeDivert.variableDivertName})`);
                    return;
                }
                const targetObject = divert.targetContent;
                if (targetObject === null) {
                    if (!attemptingTurnCountOfVariableTarget) {
                        this.Error(`Failed to find target for TURNS_SINCE: '${divert.target}'`);
                    }
                }
                else {
                    targetObject.containerForCounting.turnIndexShouldBeCounted = true;
                }
            }
            else if (this._variableReferenceToCount) {
                const runtimeVarRef = this._variableReferenceToCount.runtimeVarRef;
                if (runtimeVarRef.pathForCount !== null) {
                    this.Error(`Should be '${name}'(-> '${this._variableReferenceToCount.name}). Usage without the '->' only makes sense for variable targets.`);
                }
            }
        };
        this.ToString = () => {
            const strArgs = this.args.join(', ');
            return `${this.name}(${strArgs})`;
        };
        this._proxyDivert = new Divert(new Path(functionName), args);
        this._proxyDivert.isFunctionCall = true;
        this.AddContent(this._proxyDivert);
    }
    get name() {
        return this._proxyDivert.target.firstComponent;
    }
    get args() {
        return this._proxyDivert.args;
    }
    get runtimeDivert() {
        return this._proxyDivert.runtimeDivert;
    }
    get isChoiceCount() {
        return this.name === 'CHOICE_COUNT';
    }
    get isTurns() {
        return this.name === 'TURNS';
    }
    get isTurnsSince() {
        return this.name === 'TURNS_SINCE';
    }
    get isRandom() {
        return this.name === 'RANDOM';
    }
    get isSeedRandom() {
        return this.name === 'SEED_RANDOM';
    }
    get isListRange() {
        return this.name === 'LIST_RANGE';
    }
    get isListRandom() {
        return this.name === 'LIST_RANDOM';
    }
    get isReadCount() {
        return this.name === 'READ_COUNT';
    }
}
FunctionCall.IsBuiltIn = (name) => {
    if (NativeFunctionCall.CallExistsWithName(name)) {
        return true;
    }
    return name === 'CHOICE_COUNT' ||
        name === 'TURNS_SINCE' ||
        name === 'TURNS' ||
        name === 'RANDOM' ||
        name === 'SEED_RANDOM' ||
        name === 'LIST_VALUE' ||
        name === 'LIST_RANDOM' ||
        name === 'READ_COUNT';
};
//# sourceMappingURL=FunctionCall.js.map