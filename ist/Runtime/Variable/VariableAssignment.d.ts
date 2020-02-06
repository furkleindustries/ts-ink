import { RuntimeObject } from '../Object';
export declare class RuntimeVariableAssignment extends RuntimeObject {
    readonly variableName: null;
    readonly isNewDeclaration: boolean;
    isGlobal: boolean;
    constructor(variableName?: null, isNewDeclaration?: boolean, isGlobal?: boolean);
    readonly ToString: () => string;
}
