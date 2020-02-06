import { RuntimeContainer, } from '../../../../Runtime/Container';
import { RuntimeControlCommand, } from '../../../../Runtime/ControlCommand';
import { RuntimeDivert, } from '../../../../Runtime/Divert/Divert';
import { Object, } from '../Object';
import { NativeFunctionCall, } from '../../../../Runtime/NativeFunctionCall';
import { StringValue, } from '../../../../Runtime/Value/StringValue';
import { Weave, } from '../Weave';
export class ConditionalSingleBranch extends Object {
    constructor(content) {
        super();
        // Runtime content can be summarised as follows:
        //  - Evaluate an expression if necessary to branch on
        //  - Branch to a named container if true
        //       - Divert back to main flow
        //         (owner Conditional is in control of this target point)
        this.GenerateRuntimeObject = () => {
            // Check for common mistake, of putting "else:" instead of "- else:"
            if (this._innerWeave) {
                for (const c of this._innerWeave.content) {
                    const text = c;
                    if (text) {
                        // Don't need to trim at the start since the parser handles that already
                        if (text.text.startsWith('else:')) {
                            this.Warning('Saw the text \'else:\' which is being treated as content. Did you mean \'- else:\'?', text);
                        }
                    }
                }
            }
            const container = new RuntimeContainer();
            // Are we testing against a condition that's used for more than just this
            // branch? If so, the first thing we need to do is replicate the value that's
            // on the evaluation stack so that we don't fully consume it, in case other
            // branches need to use it.
            const duplicatesStackValue = this.matchingEquality &&
                !this.isElse;
            if (duplicatesStackValue) {
                container.AddContent(RuntimeControlCommand.Duplicate());
            }
            this._conditionalDivert = new RuntimeDivert();
            // else clause is unconditional catch-all, otherwise the divert is conditional
            this._conditionalDivert.isConditional = !this.isElse;
            // Need extra evaluation?
            if (!this.isTrueBranch && !this.isElse) {
                const needsEval = this.ownExpression !== null;
                if (needsEval) {
                    container.AddContent(RuntimeControlCommand.EvalStart());
                }
                if (this.ownExpression) {
                    this.ownExpression.GenerateIntoContainer(container);
                }
                // Uses existing duplicated value
                if (this.matchingEquality) {
                    container.AddContent(NativeFunctionCall.CallWithName('=='));
                }
                if (needsEval) {
                    container.AddContent(RuntimeControlCommand.EvalEnd());
                }
            }
            // Will pop from stack if conditional
            container.AddContent(this._conditionalDivert);
            this._contentContainer = this.GenerateRuntimeForContent();
            this._contentContainer.name = 'b';
            // Multi-line conditionals get a newline at the start of each branch
            // (as opposed to the start of the multi-line conditional since the condition
            //  may evaluate to false.)
            if (!this.isInline) {
                this._contentContainer.InsertContent(new StringValue('\n'), 0);
            }
            if (duplicatesStackValue || (this.isElse && this.matchingEquality)) {
                this._contentContainer.InsertContent(RuntimeControlCommand.PopEvaluatedValue(), 0);
            }
            container.AddToNamedContentOnly(this._contentContainer);
            this.returnDivert = new RuntimeDivert();
            this._contentContainer.AddContent(this.returnDivert);
            return container;
        };
        this.GenerateRuntimeForContent = () => {
            // Empty branch - create empty container
            if (this._innerWeave === null) {
                return new RuntimeContainer();
            }
            return this._innerWeave.rootContainer;
        };
        this.ResolveReferences = (context) => {
            this._conditionalDivert.targetPath = this._contentContainer.path;
            super.ResolveReferences(context);
        };
        // Branches are allowed to be empty
        if (content !== null) {
            this._innerWeave = new Weave(content);
            this.AddContent(this._innerWeave);
        }
    }
    // When each branch has its own expression like a switch statement,
    // this is non-null. e.g.
    // { x:
    //    - 4: the value of x is four (ownExpression is the value 4)
    //    - 3: the value of x is three
    // }
    get ownExpression() {
        return this._ownExpression;
    }
    set ownExpression(value) {
        this._ownExpression = value;
        if (this._ownExpression) {
            this.AddContent(this._ownExpression);
        }
    }
}
//# sourceMappingURL=ConditionalSingleBranch.js.map