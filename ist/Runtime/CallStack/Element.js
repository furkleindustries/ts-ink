export class CallStackElement {
    constructor(type, currentPointer, inExpressionEvaluation = false) {
        this.type = type;
        this.currentPointer = currentPointer;
        this.inExpressionEvaluation = inExpressionEvaluation;
        this.temporaryVariables = {};
        this.Copy = () => {
            const copy = new CallStackElement(this.type, this.currentPointer, this.inExpressionEvaluation);
            copy.temporaryVariables = { ...this.temporaryVariables };
            copy.evaluationStackHeightWhenPushed = this.evaluationStackHeightWhenPushed;
            copy.functionStartInOuputStream = this.functionStartInOuputStream;
            return copy;
        };
    }
}
//# sourceMappingURL=Element.js.map