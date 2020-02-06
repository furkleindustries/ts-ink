import { FlowBase, } from './Flow/FlowBase';
import { FlowLevel, } from './Flow/FlowLevel';
export class Stitch extends FlowBase {
    get flowLevel() {
        return FlowLevel.Stitch;
    }
    constructor(name, topLevelObjects, args, isFunction) {
        super(name, topLevelObjects, args, isFunction);
    }
}
//# sourceMappingURL=Stitch.js.map