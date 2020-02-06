import { RuntimeContainer } from './Container';
import { DebugMetadata } from '../DebugMetadata';
import { RuntimePath } from './Path';
import { SearchResult } from './SearchResult';
export declare abstract class RuntimeObject {
    parent: RuntimeObject;
    get debugMetadata(): DebugMetadata;
    private _debugMetadata;
    set debugMetadata(value: DebugMetadata);
    get ownDebugMetadata(): DebugMetadata;
    readonly DebugLineNumberOfPath: (path: RuntimePath) => number;
    private _path;
    get path(): RuntimePath;
    readonly ResolvePath: (path: RuntimePath) => SearchResult;
    readonly ConvertPathToRelative: (globalPath: RuntimePath) => RuntimePath;
    readonly CompactPathString: (otherPath: RuntimePath) => string;
    get rootContentContainer(): RuntimeContainer;
    readonly Copy: () => RuntimeObject;
    readonly SetChild: <T extends RuntimeObject>(obj: T, value: T) => void;
    readonly Equals: (obj: any) => boolean;
}
