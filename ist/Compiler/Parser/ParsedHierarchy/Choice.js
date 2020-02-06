import { ChoicePoint, } from '../../../Runtime/Choice/ChoicePoint';
import { RuntimeContainer, } from '../../../Runtime/Container';
import { RuntimeControlCommand, } from '../../../Runtime/ControlCommand';
import { RuntimeDivert, } from '../../../Runtime/Divert/Divert';
import { DivertTargetValue, } from '../../../Runtime/Value/DivertTargetValue';
import { Object, } from './Object';
import { SymbolType, } from './SymbolType';
import { RuntimeVariableAssignment, } from '../../../Runtime/Variable/VariableAssignment';
export class Choice extends Object {
    constructor(startContent, choiceOnlyContent, innerContent) {
        super();
        this.GenerateRuntimeObject = () => {
            this._outerContainer = new RuntimeContainer();
            // Content names for different types of choice:
            //  * start content [choice only content] inner content
            //  * start content   -> divert
            //  * start content
            //  * [choice only content]
            // Hmm, this structure has become slightly insane!
            //
            // [
            //     EvalStart
            //     assign $r = $r1   -- return target = return label 1
            //     BeginString
            //     -> s
            //     [(r1)]            -- return label 1 (after start content)
            //     EndString
            //     BeginString
            //     ... choice only content
            //     EndEval
            //     Condition expression
            //     choice: -> "c-0"
            //     (s) = [
            //         start content
            //         -> r          -- goto return label 1 or 2
            //     ]
            //  ]
            //
            //  in parent's container: (the inner content for the choice)
            //
            //  (c-0) = [
            //      EvalStart
            //      assign $r = $r2   -- return target = return label 2
            //      EndEval
            //      -> s
            //      [(r2)]            -- return label 1 (after start content)
            //      inner content
            //  ]
            // 
            this._runtimeChoice = new ChoicePoint(this.onceOnly);
            this._runtimeChoice.isInvisibleDefault = this.isInvisibleDefault;
            if (this.startContent || this.choiceOnlyContent || this.condition) {
                this._outerContainer.AddContent(RuntimeControlCommand.EvalStart());
            }
            // Start content is put into a named container that's referenced both
            // when displaying the choice initially, and when generating the text
            // when the choice is chosen.
            if (this.startContent) {
                // Generate start content and return
                //  - We can't use a function since it uses a call stack element, which would
                //    put temporary values out of scope. Instead we manually divert around.
                //  - $r is a variable divert target contains the return point
                this._returnToR1 = new DivertTargetValue();
                this._outerContainer.AddContent(this._returnToR1);
                const varAssign = new RuntimeVariableAssignment('$r', true);
                this._outerContainer.AddContent(varAssign);
                // Mark the start of the choice text generation, so that the runtime
                // knows where to rewind to to extract the content from the output stream.
                this._outerContainer.AddContent(RuntimeControlCommand.BeginString());
                this._divertToStartContentOuter = new RuntimeDivert();
                this._outerContainer.AddContent(this._divertToStartContentOuter);
                // Start content itself in a named container
                this._startContentRuntimeContainer = this.startContent.GenerateRuntimeObject();
                this._startContentRuntimeContainer.name = 's';
                // Effectively, the "return" statement - return to the point specified by $r
                const varDivert = new RuntimeDivert();
                varDivert.variableDivertName = '$r';
                this._startContentRuntimeContainer.AddContent(varDivert);
                // Add the container
                this._outerContainer.AddToNamedContentOnly(this._startContentRuntimeContainer);
                // This is the label to return to
                this._r1Label = new RuntimeContainer();
                this._r1Label.name = '$r1';
                this._outerContainer.AddContent(this._r1Label);
                this._outerContainer.AddContent(RuntimeControlCommand.EndString());
                this._runtimeChoice.hasStartContent = true;
            }
            // Choice only content - mark the start, then generate it directly into the outer container
            if (this.choiceOnlyContent) {
                this._outerContainer.AddContent(RuntimeControlCommand.BeginString());
                const choiceOnlyRuntimeContent = this.choiceOnlyContent.GenerateRuntimeObject();
                this._outerContainer.AddContentsOfContainer(choiceOnlyRuntimeContent);
                this._outerContainer.AddContent(RuntimeControlCommand.EndString());
                this._runtimeChoice.hasChoiceOnlyContent = true;
            }
            // Generate any condition for this choice
            if (this.condition) {
                this.condition.GenerateIntoContainer(this._outerContainer);
                this._runtimeChoice.hasCondition = true;
            }
            if (this.startContent || this.choiceOnlyContent || this.condition) {
                this._outerContainer.AddContent(RuntimeControlCommand.EvalEnd());
            }
            // Add choice itself
            this._outerContainer.AddContent(this._runtimeChoice);
            // Container that choice points to for when it's chosen
            this._innerContentContainer = new RuntimeContainer();
            // Repeat start content by diverting to its container
            if (this.startContent) {
                // Set the return point when jumping back into the start content
                //  - In this case, it's the $r2 point, within the choice content "c".
                this._returnToR2 = new DivertTargetValue();
                this._innerContentContainer.AddContent(RuntimeControlCommand.EvalStart());
                this._innerContentContainer.AddContent(this._returnToR2);
                this._innerContentContainer.AddContent(RuntimeControlCommand.EvalEnd());
                const varAssign = new RuntimeVariableAssignment('$r', true);
                this._innerContentContainer.AddContent(varAssign);
                // Main divert into start content
                this._divertToStartContentInner = new RuntimeDivert();
                this._innerContentContainer.AddContent(this._divertToStartContentInner);
                // Define label to return to
                this._r2Label = new RuntimeContainer();
                this._r2Label.name = '$r2';
                this._innerContentContainer.AddContent(this._r2Label);
            }
            // Choice's own inner content
            if (this.innerContent) {
                const innerChoiceOnlyContent = this.innerContent.GenerateRuntimeObject();
                this._innerContentContainer.AddContentsOfContainer(innerChoiceOnlyContent);
            }
            if (this.story.countAllVisits) {
                this._innerContentContainer.visitsShouldBeCounted = true;
            }
            this._innerContentContainer.countingAtStartOnly = true;
            return this._outerContainer;
        };
        this.ResolveReferences = (context) => {
            // Weave style choice - target own content container
            if (this._innerContentContainer) {
                this._runtimeChoice.pathOnChoice = this._innerContentContainer.path;
                if (this.onceOnly) {
                    this._innerContentContainer.visitsShouldBeCounted = true;
                }
            }
            if (this._returnToR1) {
                this._returnToR1.targetPath = this._r1Label.path;
            }
            if (this._returnToR2) {
                this._returnToR2.targetPath = this._r2Label.path;
            }
            if (this._divertToStartContentOuter) {
                this._divertToStartContentOuter.targetPath = this._startContentRuntimeContainer.path;
            }
            if (this._divertToStartContentInner) {
                this._divertToStartContentInner.targetPath = this._startContentRuntimeContainer.path;
            }
            super.ResolveReferences(context);
            if (this.name !== null && this.name.length > 0) {
                context.CheckForNamingCollisions(this, this.name, SymbolType.SubFlowAndWeave);
            }
        };
        this.ToString = () => {
            if (this.choiceOnlyContent !== null) {
                return `* ${this.startContent}[${this.choiceOnlyContent}]...`;
            }
            return `* ${this.startContent}...`;
        };
        this.startContent = startContent;
        this.choiceOnlyContent = choiceOnlyContent;
        this.innerContent = innerContent;
        this.indentationDepth = 1;
        if (startContent) {
            this.AddContent(this.startContent);
        }
        if (choiceOnlyContent) {
            this.AddContent(this.choiceOnlyContent);
        }
        if (innerContent) {
            this.AddContent(this.innerContent);
        }
        this.onceOnly = true; // default
    }
    ;
    get condition() {
        return this._condition;
    }
    set condition(value) {
        this._condition = value;
        if (this._condition) {
            this.AddContent(this._condition);
        }
    }
    // Required for IWeavePoint interface
    // Choice's target container. Used by weave to append any extra
    // nested weave content into.
    get runtimeContainer() {
        return this._innerContentContainer;
    }
    get innerContentContainer() {
        return this._innerContentContainer;
    }
    get containerForCounting() {
        return this._innerContentContainer;
    }
    // Override runtimePath to point to the Choice's target content (after it's chosen),
    // as opposed to the default implementation which would point to the choice itself
    // (or it's outer container), which is what runtimeObject is.
    get runtimePath() {
        return this._innerContentContainer.path;
    }
}
//# sourceMappingURL=Choice.js.map