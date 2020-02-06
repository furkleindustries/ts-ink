import { RuntimeContainer } from '../../../../Runtime/Container';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
export declare abstract class Expression extends Object {
    abstract GenerateIntoContainer: (container: RuntimeContainer) => void;
    private _prototypeRuntimeConstantExpression;
    outputWhenComplete: boolean;
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly GenerateConstantIntoContainer: (container: RuntimeContainer) => void;
    readonly ToString: () => string;
}
