import { Story } from '../Compiler/Parser/ParsedHierarchy/Story';
import { RuntimeStory } from '../Runtime/Story/Story';
export interface IPlugin {
    readonly PostParse: (parsedStory: Story) => void;
    readonly PostExport: (parsedStory: Story, runtimeStory: RuntimeStory) => void;
}
