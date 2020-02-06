import { CommandType, } from './CommandType';
import { RuntimeObject, } from './Object';
export class RuntimeControlCommand extends RuntimeObject {
    constructor(commandType = CommandType.NotSet) {
        super();
        this.commandType = commandType;
        this.Copy = () => (new RuntimeControlCommand(this.commandType));
        this.ToString = () => (String(this.commandType));
    }
}
// The following static factory methods are to make generating these objects
// slightly more succinct. Without these, the code gets pretty massive! e.g.
//
//     var c = new Runtime.ControlCommand(Runtime.ControlCommand.CommandType.EvalStart)
// 
// as opposed to
//
//     var c = Runtime.ControlCommand.EvalStart()
RuntimeControlCommand.EvalStart = () => (new RuntimeControlCommand(CommandType.EvalStart));
RuntimeControlCommand.EvalOutput = () => (new RuntimeControlCommand(CommandType.EvalOutput));
RuntimeControlCommand.EvalEnd = () => (new RuntimeControlCommand(CommandType.EvalEnd));
RuntimeControlCommand.Duplicate = () => (new RuntimeControlCommand(CommandType.Duplicate));
RuntimeControlCommand.PopEvaluatedValue = () => (new RuntimeControlCommand(CommandType.PopEvaluatedValue));
RuntimeControlCommand.PopFunction = () => (new RuntimeControlCommand(CommandType.PopFunction));
RuntimeControlCommand.PopTunnel = () => (new RuntimeControlCommand(CommandType.PopTunnel));
RuntimeControlCommand.BeginString = () => (new RuntimeControlCommand(CommandType.BeginString));
RuntimeControlCommand.EndString = () => (new RuntimeControlCommand(CommandType.EndString));
RuntimeControlCommand.NoOp = () => (new RuntimeControlCommand(CommandType.NoOp));
RuntimeControlCommand.ChoiceCount = () => (new RuntimeControlCommand(CommandType.ChoiceCount));
RuntimeControlCommand.Turns = () => (new RuntimeControlCommand(CommandType.Turns));
RuntimeControlCommand.TurnsSince = () => (new RuntimeControlCommand(CommandType.TurnsSince));
RuntimeControlCommand.ReadCount = () => (new RuntimeControlCommand(CommandType.ReadCount));
RuntimeControlCommand.Random = () => (new RuntimeControlCommand(CommandType.Random));
RuntimeControlCommand.SeedRandom = () => (new RuntimeControlCommand(CommandType.SeedRandom));
RuntimeControlCommand.VisitIndex = () => (new RuntimeControlCommand(CommandType.VisitIndex));
RuntimeControlCommand.SequenceShuffleIndex = () => (new RuntimeControlCommand(CommandType.SequenceShuffleIndex));
RuntimeControlCommand.StartThread = () => (new RuntimeControlCommand(CommandType.StartThread));
RuntimeControlCommand.Done = () => (new RuntimeControlCommand(CommandType.Done));
RuntimeControlCommand.End = () => (new RuntimeControlCommand(CommandType.End));
RuntimeControlCommand.ListFromInt = () => (new RuntimeControlCommand(CommandType.ListFromInt));
RuntimeControlCommand.ListRange = () => (new RuntimeControlCommand(CommandType.ListRange));
RuntimeControlCommand.ListRandom = () => (new RuntimeControlCommand(CommandType.ListRandom));
//# sourceMappingURL=ControlCommand.js.map