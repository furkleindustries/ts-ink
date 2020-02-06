import { RuntimeObject, } from '../Object';
import { RuntimePath, } from '../Path';
import { Pointer, } from '../Pointer';
import { PushPopType, } from '../PushPopType';
export class RuntimeDivert extends RuntimeObject {
    constructor(stackPushType) {
        super();
        this.Equals = (obj) => {
            const otherDivert = obj;
            if (otherDivert) {
                if (this.hasVariableTarget == otherDivert.hasVariableTarget) {
                    if (this.hasVariableTarget) {
                        return this.variableDivertName == otherDivert.variableDivertName;
                    }
                    return this.targetPath.Equals(otherDivert.targetPath);
                }
            }
            return false;
        };
        this.ToString = () => {
            if (this.hasVariableTarget) {
                return `Divert(variable: ${this.variableDivertName})`;
            }
            else if (!this.targetPath) {
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
                }
                else {
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
        if (stackPushType) {
            this.pushesToStack = true;
            this.stackPushType = stackPushType;
        }
        else {
            this.pushesToStack = false;
        }
    }
    get targetPath() {
        // Resolve any relative paths to global ones as we come across them
        if (this._targetPath && this._targetPath.isRelative) {
            const targetObj = this.targetPointer.Resolve();
            if (targetObj) {
                this._targetPath = targetObj.path;
            }
        }
        return this._targetPath;
    }
    set targetPath(value) {
        this._targetPath = value;
        this._targetPointer = Pointer.Null;
    }
    get targetPointer() {
        if (this._targetPointer.isNull) {
            const targetObj = this.ResolvePath(this.targetPath).obj;
            if (this.targetPath.lastComponent.isIndex) {
                this._targetPointer.container = targetObj.parent;
                this._targetPointer.index = this.targetPath.lastComponent.index;
            }
            else {
                this._targetPointer = Pointer.StartOf(targetObj);
            }
        }
        return this._targetPointer;
    }
    get targetPathString() {
        if (!this.targetPath) {
            return null;
        }
        return this.CompactPathString(this.targetPath);
    }
    set targetPathString(value) {
        if (value == null) {
            this.targetPath = null;
        }
        else {
            this.targetPath = new RuntimePath({ componentsString: value });
        }
    }
    get hasVariableTarget() {
        return Boolean(this.variableDivertName);
    }
}
//# sourceMappingURL=Divert.js.map