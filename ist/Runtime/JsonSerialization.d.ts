import { RuntimeChoice } from './Choice/Choice';
import { RuntimeContainer } from './Container';
import { ListDefinitionsOrigin } from './ListDefinitionsOrigin';
import { ListValue } from './Value/ListValue';
import { RuntimeObject } from './Object';
export declare class JsonSerialization {
    private static _controlCommandNames;
    static get controlCommandNames(): string[];
    static readonly JArrayToRuntimeObjList: (jArray: any[], skipLast?: boolean) => RuntimeObject[];
    static readonly WriteDictionaryRuntimeObjs: (dictionary: Record<string, RuntimeObject>) => {
        [x: string]: RuntimeObject;
    };
    static readonly WriteListRuntimeObjs: (list: RuntimeObject[]) => (string | number | Record<string, any>)[];
    static readonly WriteIntDictionary: (dict: Map<string, number>) => Record<string, number>;
    static readonly WriteRuntimeObject: (obj: RuntimeObject) => string | number | Record<string, any>;
    static readonly JObjectToDictionaryRuntimeObjs: (jObject: Record<string, any>) => Record<string, RuntimeObject>;
    static readonly JObjectToIntDictionary: (jObject: Record<string, any>) => Record<string, number>;
    static readonly JTokenToRuntimeObject: (token: any) => RuntimeObject;
    static readonly WriteRuntimeContainer: (container: RuntimeContainer, withoutName?: boolean) => any[];
    static readonly JArrayToContainer: (jArray: any[]) => RuntimeContainer;
    static readonly JObjectToChoice: (jObj: Record<string, any>) => RuntimeChoice;
    static readonly WriteChoice: (choice: RuntimeChoice) => Record<string, any>;
    static readonly WriteInkList: (listVal: ListValue) => Record<string, any>;
    static readonly JTokenToListDefinitions: (obj: any) => ListDefinitionsOrigin;
    constructor();
}
