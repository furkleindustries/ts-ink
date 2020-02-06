import { RuntimePath } from '../Path';
import { Value } from './Value';
import { ValueType } from './ValueType';
export declare class DivertTargetValue extends Value<RuntimePath> {
    get targetPath(): RuntimePath;
    set targetPath(value: RuntimePath);
    get valueType(): ValueType;
    get isTruthy(): boolean;
    constructor(targetPath?: RuntimePath);
    readonly Cast: (newType: ValueType) => DivertTargetValue;
    readonly ToString: () => string;
}
