import {
  IPlugin,
} from './IPlugin';
import {
  Story,
} from '../Compiler/Parser/ParsedHierarchy/Story';
import {
  RuntimeStory,
} from '../Runtime/Story/Story';

export class PluginManager {
  private _plugins: IPlugin[] = [];
  get plugins(): IPlugin[] {
    return this._plugins;
  }

  constructor(pluginNames: string[]) {
    /**
     * Not implemented yet.
     */
  }

  public readonly PostParse = (parsedStory: Story): void => {
    for (const plugin of this.plugins) {
      plugin.PostParse(parsedStory);
    }
  };

  public readonly PostExport = (
    parsedStory: Story,
    runtimeStory: RuntimeStory,
  ): void => {
    for (const plugin of this.plugins) {
      plugin.PostExport(parsedStory, runtimeStory);
    }
  };
}
