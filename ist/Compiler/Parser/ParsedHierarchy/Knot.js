import { FlowBase, } from './Flow/FlowBase';
import { FlowLevel, } from './Flow/FlowLevel';
export class Knot extends FlowBase {
    constructor(name, topLevelObjects, args, isFunction) {
        super(name, topLevelObjects, args, isFunction);
        this.ResolveReferences = (context) => {
            super.ResolveReferences(context);
            var parentStory = this.story;
            // Enforce rule that stitches must not have the same
            // name as any knots that exist in the story
            for (const stitchName in this.subFlowsByName) {
                const knotWithStitchName = parentStory.ContentWithNameAtLevel(stitchName, FlowLevel.Knot, false);
                if (knotWithStitchName) {
                    const stitch = this.subFlowsByName[stitchName];
                    const errorMsg = `Stitch '${stitch.name}' has the same name as a knot (on ${knotWithStitchName.debugMetadata})`;
                    this.Error(errorMsg, stitch);
                }
            }
        };
    }
    get flowLevel() {
        return FlowLevel.Knot;
    }
}
//# sourceMappingURL=Knot.js.map