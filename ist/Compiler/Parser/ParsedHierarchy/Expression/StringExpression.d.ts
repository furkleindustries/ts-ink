import { RuntimeContainer } from '../../../../Runtime/Container';
import { Expression } from './Expression';
import { Object } from '../Object';
export declare class StringExpression extends Expression {
    get isSingleString(): boolean;
    constructor(content: Object[]);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    readonly ToString: () => string;
    readonly Equals: (obj: Object) => boolean;
}
