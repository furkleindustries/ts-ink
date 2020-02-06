import { RuntimeObject, } from '../Object';
import { RuntimePath, } from '../Path';
/// <summary>
/// The ChoicePoint represents the point within the Story where
/// a Choice instance gets generated. The distinction is made
/// because the text of the Choice can be dynamically generated.
/// </summary>
export class ChoicePoint extends RuntimeObject {
    constructor(onceOnly = true) {
        super();
        this.onceOnly = onceOnly;
        this.ToString = () => {
            const targetLineNum = this.DebugLineNumberOfPath(this.pathOnChoice);
            let targetString = this.pathOnChoice.ToString();
            if (targetLineNum !== null && targetLineNum !== undefined) {
                targetString = ` line ${targetLineNum}(${targetString})`;
            }
            return `Choice: -> ${targetString}`;
        };
    }
    ;
    get pathOnChoice() {
        // Resolve any relative paths to global ones as we come across them
        if (this._pathOnChoice && this._pathOnChoice.isRelative) {
            const choiceTargetObj = this.choiceTarget;
            if (choiceTargetObj) {
                this._pathOnChoice = choiceTargetObj.path;
            }
        }
        return this._pathOnChoice;
    }
    set pathOnChoice(value) {
        this._pathOnChoice = value;
    }
    get choiceTarget() {
        return this.ResolvePath(this.pathOnChoice).container;
    }
    get pathStringOnChoice() {
        return this.CompactPathString(this.pathOnChoice);
    }
    set pathStringOnChoice(value) {
        this.pathOnChoice = new RuntimePath({ componentsString: value });
    }
    get flags() {
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
    set flags(value) {
        this.hasCondition = (value & 1) > 0;
        this.hasStartContent = (value & 2) > 0;
        this.hasChoiceOnlyContent = (value & 4) > 0;
        this.isInvisibleDefault = (value & 8) > 0;
        this.onceOnly = (value & 16) > 0;
    }
}
//# sourceMappingURL=ChoicePoint.js.map