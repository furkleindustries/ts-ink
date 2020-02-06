export class PluginManager {
    constructor(pluginNames) {
        this._plugins = [];
        this.PostParse = (parsedStory) => {
            for (const plugin of this.plugins) {
                plugin.PostParse(parsedStory);
            }
        };
        this.PostExport = (parsedStory, runtimeStory) => {
            for (const plugin of this.plugins) {
                plugin.PostExport(parsedStory, runtimeStory);
            }
        };
        /**
         * Not implemented yet.
         */
    }
    get plugins() {
        return this._plugins;
    }
}
//# sourceMappingURL=PluginManager.js.map