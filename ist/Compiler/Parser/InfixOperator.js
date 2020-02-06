export class InfixOperator {
    constructor(type, precedence, requireWhitespace) {
        this.type = type;
        this.precedence = precedence;
        this.requireWhitespace = requireWhitespace;
        this.ToString = () => this.type;
    }
}
//# sourceMappingURL=InfixOperator.js.map