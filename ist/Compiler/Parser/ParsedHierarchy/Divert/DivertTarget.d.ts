import { RuntimeContainer } from '../../../../Runtime/Container';
import { Divert } from './Divert';
import { Expression } from '../Expression/Expression';
import { Story } from '../Story';
export declare class DivertTarget extends Expression {
    private _runtimeDivert;
    private _runtimeDivertTargetValue;
    divert: Divert;
    constructor(divert: Divert);
    readonly GenerateIntoContainer: (container: RuntimeContainer) => void;
    readonly ResolveReferences: (context: Story) => void;
    readonly Equals: (obj: Object) => boolean;
}
