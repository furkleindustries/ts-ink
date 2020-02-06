import {
  RuntimeChoice,
} from './Choice/Choice';
import {
  ChoicePoint,
} from './Choice/ChoicePoint';
import {
  CommandType,
} from './CommandType';
import {
  RuntimeContainer,
} from './Container';
import {
  RuntimeControlCommand,
} from './ControlCommand';
import {
  RuntimeDivert,
} from './Divert/Divert';
import {
  DivertTargetValue,
} from './Value/DivertTargetValue';
import {
  FloatValue,
} from './Value/FloatValue';
import {
  RuntimeGlue,
} from './Glue';
import {
  RuntimeInkList,
} from './List/InkList';
import {
  RuntimeInkListItem,
} from './List/InkListItem';
import {
  IntValue,
} from './Value/IntValue';
import {
  RuntimeListDefinition,
} from './List/ListDefinition';
import {
  ListDefinitionsOrigin,
} from './ListDefinitionsOrigin';
import {
  ListValue,
} from './Value/ListValue';
import {
  NativeFunctionCall,
} from './NativeFunctionCall';
import {
  RuntimeObject,
} from './Object';
import {
  RuntimePath,
} from './Path';
import {
  PushPopType,
} from './PushPopType';
import {
  StringValue,
} from './Value/StringValue';
import {
  RuntimeTag,
} from './Tag';
import {
  Value,
} from './Value/Value';
import {
  RuntimeVariableAssignment,
} from './Variable/VariableAssignment';
import {
  VariablePointerValue,
} from './Value/VariablePointerValue';
import {
  RuntimeVariableReference,
} from './Variable/VariableReference';
import {
  Void,
} from './Void';

export class JsonSerialization {
  private static _controlCommandNames: string[] = [];
  static get controlCommandNames(): string[] {
    return this._controlCommandNames;
  }

  public static readonly JArrayToRuntimeObjList =(
    jArray: any[],
    skipLast: boolean = false,
  ): RuntimeObject[] => {
    let count = jArray.length;
    if (skipLast) {
      count -= 1;
    }

    const list: RuntimeObject[] = new Array(jArray.length);
    for (let ii = 0; ii < count; ii += 1) {
      const jTok = jArray [ii];
      const runtimeObj = JsonSerialization.JTokenToRuntimeObject(jTok);
      list.push(runtimeObj);
    }

    return list;
  };

  public static readonly WriteDictionaryRuntimeObjs = (
    dictionary: Record<string, RuntimeObject>,
  ) => ({ ...dictionary });


  public static readonly WriteListRuntimeObjs = (list: RuntimeObject[]) => (
    list.map((val) => JsonSerialization.WriteRuntimeObject(val))
  );

  public static readonly WriteIntDictionary = (
    dict: Map<string, number>,
  ): Record<string, number> => (
    Array.from(dict.entries()).reduce((dict, val) => {
      dict[val[0]] = dict[1];
      return dict;
    }, {})
  );

  public static readonly WriteRuntimeObject = (
    obj: RuntimeObject,
  ): Record<string, any> | string | number => {
    const writer: Record<string, any> = {};

    const container = obj as RuntimeContainer;
    if (container) {
      return JsonSerialization.WriteRuntimeContainer(container);
    }

    const divert = obj as RuntimeDivert;
    if (divert) {
      let divTypeKey = '->';
      if (divert.isExternal) {
        divTypeKey = 'x()';
      } else if (divert.pushesToStack) {
        if (divert.stackPushType === PushPopType.Function) {
          divTypeKey = 'f()';
        } else if (divert.stackPushType === PushPopType.Tunnel) {
          divTypeKey = '->t->';
        }
      }

      let targetStr: string = divert.targetPathString;
      if (divert.hasVariableTarget) {
        targetStr = divert.variableDivertName;
      }


      writer[divTypeKey] = targetStr;

      if (divert.hasVariableTarget) {
        writer.var = true;
      }

      if (divert.isConditional) {
        writer.c = true;
      }

      if (divert.externalArgs > 0) {
        writer.exArgs = divert.externalArgs;
      }

      return writer;
    } else if (obj instanceof ChoicePoint) {
      writer['*'] = obj.pathStringOnChoice;
      writer.flg = obj.flags;
      return writer;
    } else if (obj instanceof IntValue) {
      return obj.value;
    } else if (obj instanceof FloatValue) {
      return obj.value;
    } else if (obj instanceof StringValue) {
      if (obj.isNewline) {
        return '\\n';
      }
      
      return `^${obj.value}`;
    } else if (obj instanceof ListValue) {
      return JsonSerialization.WriteInkList(obj);
    } else if (obj instanceof DivertTargetValue) {
      writer['^->'] = obj.value.componentsString;
      return writer;
    } else if (obj instanceof VariablePointerValue) {
      writer['^var'] = obj.value;
      writer.ci = obj.contextIndex;

      return writer;
    } else if (obj instanceof RuntimeGlue) {
      return '<>';
    } else if (obj instanceof RuntimeControlCommand) {
      return JsonSerialization.controlCommandNames[obj.commandType];
    } else if (obj instanceof NativeFunctionCall) {
      let name = obj.name;

      // Avoid collision with ^ used to indicate a string
      if (name === '^') {
        name = 'L^';
      }

      return name;
    } else if (obj instanceof RuntimeVariableReference) {
      // Variable reference
      const readCountPath: string = obj.pathStringForCount;
      if (readCountPath !== null && readCountPath !== undefined) {
        writer['CNT?'] = readCountPath;
      } else {
        writer['VAR?'] = obj.name;
      }

      return writer;
    } else if (obj instanceof RuntimeVariableAssignment) {
      const key = obj.isGlobal ? 'VAR=' : 'temp=';
      writer[key] = obj.variableName;

      // Reassignment?
      if (!obj.isNewDeclaration) {
        writer.re = true;
      }

      return writer;
    } else if (obj instanceof Void) {
      // Void
      return 'void';
    } else if (obj instanceof RuntimeTag) {
      // Tag
      writer['#'] = obj.text;
      return writer;
    } else if (obj instanceof RuntimeChoice) {
      // Used when serialising save state only
      return JsonSerialization.WriteChoice(obj);
    }

    throw new Error(`Failed to write runtime object to JSON: ${obj}`);
  };

  public static readonly JObjectToDictionaryRuntimeObjs = (
    jObject: Record<string, any>,
  ): Record<string, RuntimeObject> => {
    const dict = {};
    for (const key in jObject) {
      dict[key] = JsonSerialization.JTokenToRuntimeObject(jObject[key]);
    }

    return dict;
  };

  public static readonly JObjectToIntDictionary = (
    jObject: Record<string, any>,
  ): Record<string, number> => {
    const dict = {};
    for (const key in jObject) {
      dict[key] = Number(jObject[key]);
    }

    return dict;
  };

  // ----------------------
  // JSON ENCODING SCHEME
  // ----------------------
  //
  // Glue:           "<>", "G<", "G>"
  // 
  // ControlCommand: "ev", "out", "/ev", "du" "pop", "->->", "~ret", "str", "/str", "nop", 
  //                 "choiceCnt", "turns", "visit", "seq", "thread", "done", "end"
  // 
  // NativeFunction: "+", "-", "/", "*", "%" "~", "==", ">", "<", ">=", "<=", "!=", "!"... etc
  // 
  // Void:           "void"
  // 
  // Value:          "^string value", "^^string value beginning with ^"
  //                 5, 5.2
  //                 {"^->": "path.target"}
  //                 {"^var": "varname", "ci": 0}
  // 
  // Container:      [...]
  //                 [..., 
  //                     {
  //                         "subContainerName": ..., 
  //                         "#f": 5,                    // flags
  //                         "#n": "containerOwnName"    // only if not redundant
  //                     }
  //                 ]
  // 
  // Divert:         {"->": "path.target", "c": true }
  //                 {"->": "path.target", "var": true}
  //                 {"f()": "path.func"}
  //                 {"->t->": "path.tunnel"}
  //                 {"x()": "externalFuncName", "exArgs": 5}
  // 
  // Var Assign:     {"VAR=": "varName", "re": true}   // reassignment
  //                 {"temp=": "varName"}
  // 
  // Var ref:        {"VAR?": "varName"}
  //                 {"CNT?": "stitch name"}
  // 
  // ChoicePoint:    {"*": pathString,
  //                  "flg": 18 }
  //
  // Choice:         Nothing too clever, it's only used in the save state,
  //                 there's not likely to be many of them.
  // 
  // Tag:            {"#": "the tag text"}
  public static readonly JTokenToRuntimeObject = (
    token: any,
  ): RuntimeObject => {
    if (typeof token === 'number') {
      return Value.Create(token);
    }
    
    if (typeof token === 'string') {
      let str = String(token);

      // String value
      const firstChar = str[0];
      if (firstChar === '^') {
        return new StringValue(str.slice(1));
      } else if (firstChar === '\n' && str.length === 1) {
        return new StringValue('\n');
      } else if (str === '<>') {
        // Glue
        return new RuntimeGlue();
      }

      // Control commands (would looking up in a hash set be faster?)
      for (let ii = 0; ii < JsonSerialization.controlCommandNames.length; ++ii) {
        let cmdName: string = JsonSerialization.controlCommandNames[ii];
        if (str === cmdName) {
          return new RuntimeControlCommand(ii as CommandType);
        }
      }

      // Native functions
      // "^" conflicts with the way to identify strings, so now
      // we know it's not a string, we can convert back to the proper
      // symbol for the operator.
      if (str === 'L^') {
        str = '^';
      }

      if (NativeFunctionCall.CallExistsWithName(str)) {
        return NativeFunctionCall.CallWithName(str);
      }

      // Pop
      if (str === '->->') {
        return RuntimeControlCommand.PopTunnel();
      } else if (str == '~ret') {
        return RuntimeControlCommand.PopFunction();
      } else if (str === 'void') {
        // Void
        return new Void();
      }
    } else if (token && typeof token === 'object') {
      const obj = token as Record<string, object>;
      let propValue: any;

      // Divert target value to path
      if (propValue = obj['^->']) {
        return new DivertTargetValue(
          new RuntimePath({ componentsString: String(obj['^->']) }),
        );
      } else if (propValue = obj['^var']) {
          // VariablePointerValue
        const varPtr = new VariablePointerValue(String(obj['^var']));
        if (obj.ci) {
          varPtr.contextIndex = Number(obj.ci);
        }

        return varPtr;
      }

      // Divert
      let isDivert = false;
      let pushesToStack = false;
      let divPushType: PushPopType = PushPopType.Function;
      let external = false;
      if (propValue = obj['->']) {
        isDivert = true;
      } else if (propValue = obj['f()']) {
        isDivert = true;
        pushesToStack = true;
        divPushType = PushPopType.Function;
      } else if (propValue = obj['->t->']) {
        isDivert = true;
        pushesToStack = true;
        divPushType = PushPopType.Tunnel;
      } else if (propValue = obj['x()']) {
        isDivert = true;
        external = true;
        pushesToStack = false;
        divPushType = PushPopType.Function;
      }

      if (isDivert) {
        const divert = new RuntimeDivert();
        divert.pushesToStack = pushesToStack;
        divert.stackPushType = divPushType;
        divert.isExternal = external;

        let target = propValue.ToString ();

        if (obj.var) {
          divert.variableDivertName = target;
        } else {
          divert.targetPathString = target;
        }

        divert.isConditional = Boolean(obj['c']);

        if (external && obj.exArgs) {
          divert.externalArgs = Number(obj.exArgs);
        }

        return divert;
      } else if (obj['*']) {
        // Choice
        const choice = new ChoicePoint();
        choice.pathStringOnChoice = String(obj['*']);
        if (obj.flg) {
          choice.flags = Number(obj.flg);
        }

        return choice;
      } else if (obj['VAR?']) {
        // Variable reference
        return new RuntimeVariableReference(String(obj['VAR?']));
      } else if (obj['CNT?']) {
        const readCountVarRef = new RuntimeVariableReference();
        readCountVarRef.pathStringForCount = String(obj['CNT?']);
        return readCountVarRef;
      }

      // Variable assignment
      let isVarAss = false;
      let isGlobalVar = false;
      if (obj['VAR=']) {
        isVarAss = true;
        isGlobalVar = true;
        propValue = obj['VAR='];
      } else if (obj['temp=']) {
        isVarAss = true;
        isGlobalVar = false;
        propValue = obj['temp='];
      }

      if (isVarAss) {
        const varName = String(propValue);
        const isNewDecl = !obj.re;
        const varAss = new RuntimeVariableAssignment(varName, isNewDecl);
        varAss.isGlobal = isGlobalVar;
        return varAss;
      } else if (obj['#']) {
        // Tag
        return new RuntimeTag(String(obj['#']));
      } else if (obj.list) {
        // List value
        const listContent: Record<string, any> = obj.list;
        const rawList = new RuntimeInkList();
        if (Array.isArray(obj.origins)) {
          const namesAsObjs = obj.origins as any[];
          rawList.SetInitialOriginNames(namesAsObjs.map(String));
        }

        for (const nameToVal in listContent) {
          const item = new RuntimeInkListItem(nameToVal);
          const val = listContent[nameToVal];
          rawList.Add(item, val);
        }

        return new ListValue({ list: rawList });
      } else if (obj.originalChoicePath !== null &&
        obj.originalChoicePath !== undefined)
      {
          // Used when serialising save state only
        return JsonSerialization.JObjectToChoice(obj);
      }
    } else if (Array.isArray(token)) {
      // Array is always a RuntimeContainer
      return JsonSerialization.JArrayToContainer(token);
    } else if (token === null || token === undefined) {
      return null;
    }

    throw new Error(`Failed to convert token to runtime object: ${token}.`);
  };

  public static readonly WriteRuntimeContainer = (
    container: RuntimeContainer,
    withoutName: boolean = false,
  ): any[] => {
    const writer = [];

    for (const c of container.content) {
      writer.push(JsonSerialization.WriteRuntimeObject(c));
    }

    // Container is always an array [...]
    // But the final element is always either:
    //  - a dictionary containing the named content, as well as possibly
    //    the key "#" with the count flags
    //  - null, if neither of the above
    const namedOnlyContent = container.namedOnlyContent;
    const countFlags = container.countFlags;
    const hasNameProperty = container.name != null && !withoutName;

    const hasTerminator = namedOnlyContent !== null || countFlags > 0 || hasNameProperty;

    if (hasTerminator) {
      writer.push({});
    }

    const terminator = writer[writer.length - 1];

    if (namedOnlyContent) {
      for (const key in namedOnlyContent) {
        const namedContainer = namedOnlyContent[key] as RuntimeContainer;
        terminator[key] = JsonSerialization.WriteRuntimeContainer(namedContainer, true);
      }
    }

    if (countFlags > 0) {
      terminator['#f'] = countFlags;
    }

    if (hasNameProperty) {
      terminator['#n'] = container.name;
    }

    if (!hasTerminator) {
      writer.push(null);
    }

    return writer;
  };

  public static readonly JArrayToContainer = (jArray: any[]) => {
    var container = new RuntimeContainer();
    container.content = JsonSerialization.JArrayToRuntimeObjList(jArray, true);

    // Final object in the array is always a combination of
    //  - named content
    //  - a "#f" key with the countFlags
    // (if either exists at all, otherwise null)
    const terminatingObj = jArray[jArray.length - 1] as Record<string, any>;
    if (terminatingObj) {
      const namedOnlyContent: Map<string, RuntimeObject> = new Map();
      for (const key in terminatingObj) {
        const value = terminatingObj[key];
        if (key === '#f') {
          container.countFlags = Number(value);
        } else if (key === '#n') {
          container.name = String(value);
        } else {
          const namedContentItem = JsonSerialization.JTokenToRuntimeObject(value);
          const namedSubContainer = namedContentItem as RuntimeContainer;
          if (namedSubContainer) {
            namedSubContainer.name = key;
          }

          namedOnlyContent.set(key, namedContentItem);
        }
      }

      container.namedOnlyContent = namedOnlyContent;
    }

    return container;
  };

  public static readonly JObjectToChoice = (
    jObj: Record<string, any>,
  ): RuntimeChoice => {
    var choice = new RuntimeChoice();
    choice.text = String(jObj.text);
    choice.index = Number(jObj.index);
    choice.sourcePath = String(jObj.originalChoicePath);
    choice.originalThreadIndex = Number(jObj.originalThreadIndex);
    choice.pathStringOnChoice = jObj.targetPath.ToString();
    return choice;
  };

  public static readonly WriteChoice = (choice: RuntimeChoice): Record<string, any> => {
    const writer: Record<string, any> = {};
    writer.text = choice.text;
    writer.index = choice.index;
    writer.originalChoicePath = choice.sourcePath;
    writer.originalThreadIndex = choice.originalThreadIndex;
    writer.targetPath = choice.pathStringOnChoice;
    return writer;
  };

  static readonly WriteInkList = (listVal: ListValue): Record<string, any> => {
    const writer: Record<string, any> = {};
    const rawList = listVal.value;

    writer.list = rawList.Keys().reduce((obj, key) => {
      const value = rawList.Get(key);
      const dictKey = `${key.originName || '?'}.${key.itemName}`;
      obj[dictKey] = value;
      return obj;
    });

    if (rawList.Size() && rawList.originNames && rawList.originNames.length) {
      writer.origins = [ ...rawList.originNames ];
    }

    return writer;
  };

  public static readonly JTokenToListDefinitions = (
    obj: any,
  ): ListDefinitionsOrigin => {
    const defsObj = obj as Record<string, any>;
    const allDefs: RuntimeListDefinition[] = [];
    for (const key in defsObj) {
      const listDefJson = defsObj[key];

      // Cast (string, object) to (string, int) for items
      const items: Record<string, number> = {};
      for (const nameValue in listDefJson) {
        items[nameValue] = Number(listDefJson[nameValue]);
      }

      const def = new RuntimeListDefinition(
        name,
        new Map(Object.keys(items).map((key) => [ key, items[key] ])),
      );

      allDefs.push(def);
    }

    return new ListDefinitionsOrigin(allDefs);
  };

  constructor() {
    JsonSerialization._controlCommandNames = new Array(CommandType.TOTAL_VALUES);

    JsonSerialization.controlCommandNames[CommandType.EvalStart] = "ev";
    JsonSerialization.controlCommandNames[CommandType.EvalOutput] = "out";
    JsonSerialization.controlCommandNames[CommandType.EvalEnd] = "/ev";
    JsonSerialization.controlCommandNames[CommandType.Duplicate] = "du";
    JsonSerialization.controlCommandNames[CommandType.PopEvaluatedValue] = "pop";
    JsonSerialization.controlCommandNames[CommandType.PopFunction] = "~ret";
    JsonSerialization.controlCommandNames[CommandType.PopTunnel] = "->->";
    JsonSerialization.controlCommandNames[CommandType.BeginString] = "str";
    JsonSerialization.controlCommandNames[CommandType.EndString] = "/str";
    JsonSerialization.controlCommandNames[CommandType.NoOp] = "nop";
    JsonSerialization.controlCommandNames[CommandType.ChoiceCount] = "choiceCnt";
    JsonSerialization.controlCommandNames[CommandType.Turns] = "turn";
    JsonSerialization.controlCommandNames[CommandType.TurnsSince] = "turns";
    JsonSerialization.controlCommandNames[CommandType.ReadCount] = "readc";
    JsonSerialization.controlCommandNames[CommandType.Random] = "rnd";
    JsonSerialization.controlCommandNames[CommandType.SeedRandom] = "srnd";
    JsonSerialization.controlCommandNames[CommandType.VisitIndex] = "visit";
    JsonSerialization.controlCommandNames[CommandType.SequenceShuffleIndex] = "seq";
    JsonSerialization.controlCommandNames[CommandType.StartThread] = "thread";
    JsonSerialization.controlCommandNames[CommandType.Done] = "done";
    JsonSerialization.controlCommandNames[CommandType.End] = "end";
    JsonSerialization.controlCommandNames[CommandType.ListFromInt] = "listInt";
    JsonSerialization.controlCommandNames[CommandType.ListRange] = "range";
    JsonSerialization.controlCommandNames[CommandType.ListRandom] = "lrnd";

    for (let ii = 0; ii < Number(CommandType.TOTAL_VALUES); ++ii) {
      if (!JsonSerialization.controlCommandNames[ii]) {
        throw new Error('Control command not accounted for in serialisation.');
      }
    }
  }
}

