export declare class InfixOperator {
    readonly type: string;
    readonly precedence: number;
    readonly requireWhitespace: boolean;
    constructor(type: string, precedence: number, requireWhitespace: boolean);
    readonly ToString: () => string;
}
