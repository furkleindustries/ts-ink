import {
  Argument,
} from './Argument';
import {
  FlowBase,
} from './Flow/FlowBase';
import {
  FlowLevel,
} from './Flow/FlowLevel';
import {
  Object,
} from './Object';
import {
  Story,
} from './Story';

export class Knot extends FlowBase {
  get flowLevel(): FlowLevel {
    return FlowLevel.Knot;
  }

  constructor(
    name: string,
    topLevelObjects: Object[],
    args: Argument[],
    isFunction: boolean)
  {
    super(name, topLevelObjects, args, isFunction);
  }

  public readonly ResolveReferences = (context: Story): void => {
    super.ResolveReferences(context);

    var parentStory = this.story;

    // Enforce rule that stitches must not have the same
    // name as any knots that exist in the story
    for (const stitchName in this.subFlowsByName) {
      const knotWithStitchName = parentStory.ContentWithNameAtLevel(
        stitchName,
        FlowLevel.Knot,
        false,
      );

      if (knotWithStitchName) {
        const stitch = this.subFlowsByName[stitchName];
        const errorMsg = `Stitch '${stitch.name}' has the same name as a knot (on ${knotWithStitchName.debugMetadata})`;
        this.Error(errorMsg, stitch);
      }
    }
  };
}
