import {
  Story,
} from '../Compiler/Parser/ParsedHierarchy/Story';
import {
  RuntimeStory,
} from '../Runtime/Story/Story';

export interface IPlugin {
  // Hooks: if in doubt use PostExport, since the parsedStory is in a more finalised state.

  // Hook for immediately after the story has been parsed into its basic Parsed hierarchy.
  // Could be useful for modifying the story before it's exported.
  readonly PostParse: (parsedStory: Story) => void;

  // Hook for after parsed story has been converted into its runtime equivalent. Note that
  // during this process the parsed story will have changed structure too, to take into 
  // account analysis of the structure of Weave, for example.
  readonly PostExport: (
    parsedStory: Story,
    runtimeStory: RuntimeStory,
  ) => void;
}
