import { IPlugin } from './IPlugin';
import { Story } from '../Compiler/Parser/ParsedHierarchy/Story';
import { RuntimeStory } from '../Runtime/Story/Story';
export declare class PluginManager {
    private _plugins;
    get plugins(): IPlugin[];
    constructor(pluginNames: string[]);
    readonly PostParse: (parsedStory: Story) => void;
    readonly PostExport: (parsedStory: Story, runtimeStory: RuntimeStory) => void;
}
