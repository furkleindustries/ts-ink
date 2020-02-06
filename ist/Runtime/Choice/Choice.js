import { RuntimeObject, } from '../Object';
import { RuntimePath, } from '../Path';
/// <summary>
/// A generated Choice from the story.
/// A single ChoicePoint in the Story could potentially generate
/// different Choices dynamically dependent on state, so they're
/// separated.
/// </summary>
export class RuntimeChoice extends RuntimeObject {
    /// <summary>
    /// The target path that the Story should be diverted to if
    /// this Choice is chosen.
    /// </summary>
    get pathStringOnChoice() {
        return this.targetPath.ToString();
    }
    set pathStringOnChoice(value) {
        this.targetPath = new RuntimePath({ componentsString: value });
    }
}
//# sourceMappingURL=Choice.js.map