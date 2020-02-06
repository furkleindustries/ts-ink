import { RuntimeContainer, } from '../../../../Runtime/Container';
import { RuntimeControlCommand, } from '../../../../Runtime/ControlCommand';
import { Object, } from '../Object';
export class Conditional extends Object {
    constructor(initialCondition, branches) {
        super();
        this.initialCondition = initialCondition;
        this.branches = branches;
        this.GenerateRuntimeObject = () => {
            const container = new RuntimeContainer();
            // Initial condition
            if (this.initialCondition) {
                container.AddContent(this.initialCondition.runtimeObject);
            }
            // Individual branches
            for (const branch of this.branches) {
                const branchContainer = branch.runtimeObject;
                container.AddContent(branchContainer);
            }
            // If it's a switch-like conditional, each branch
            // will have a "duplicate" operation for the original
            // switched value. If there's no final else clause
            // and we fall all the way through, we need to clean up.
            // (An else clause doesn't dup but it *does* pop)
            if (this.initialCondition !== null &&
                this.branches[0].ownExpression !== null &&
                !this.branches[this.branches.length - 1].isElse) {
                container.AddContent(RuntimeControlCommand.PopEvaluatedValue());
            }
            // Target for branches to rejoin to
            this._reJoinTarget = RuntimeControlCommand.NoOp();
            container.AddContent(this._reJoinTarget);
            return container;
        };
        this.ResolveReferences = (context) => {
            const pathToReJoin = this._reJoinTarget.path;
            for (const branch of this.branches) {
                branch.returnDivert.targetPath = pathToReJoin;
            }
            super.ResolveReferences(context);
        };
        if (this.initialCondition) {
            this.AddContent(this.initialCondition);
        }
        if (this.branches !== null) {
            this.AddContent(this.branches);
        }
    }
}
//# sourceMappingURL=Conditional.js.map