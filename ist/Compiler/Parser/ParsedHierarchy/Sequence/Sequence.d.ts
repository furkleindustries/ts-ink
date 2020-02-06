import { ContentList } from '../ContentList';
import { RuntimeDivert } from '../../../../Runtime/Divert/Divert';
import { Object } from '../Object';
import { RuntimeObject } from '../../../../Runtime/Object';
import { SequenceType } from './SequenceType';
import { Story } from '../Story';
export declare class Sequence extends Object {
    readonly sequenceType: SequenceType;
    private _sequenceDivertsToResolve;
    sequenceElements: Object[];
    constructor(elementContentLists: ContentList[], sequenceType: SequenceType);
    readonly GenerateRuntimeObject: () => RuntimeObject;
    readonly AddDivertToResolve: (divert: RuntimeDivert, targetContent: RuntimeObject) => void;
    readonly ResolveReferences: (context: Story) => void;
}
