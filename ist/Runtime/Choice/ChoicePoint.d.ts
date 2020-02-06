import { RuntimeContainer } from '../Container';
import { RuntimeObject } from '../Object';
import { RuntimePath } from '../Path';
export declare class ChoicePoint extends RuntimeObject {
    onceOnly: boolean;
    private _pathOnChoice;
    get pathOnChoice(): RuntimePath;
    set pathOnChoice(value: RuntimePath);
    get choiceTarget(): RuntimeContainer;
    get pathStringOnChoice(): string;
    set pathStringOnChoice(value: string);
    hasCondition: boolean;
    hasStartContent: boolean;
    hasChoiceOnlyContent: boolean;
    isInvisibleDefault: boolean;
    get flags(): number;
    set flags(value: number);
    constructor(onceOnly?: boolean);
    readonly ToString: () => string;
}
