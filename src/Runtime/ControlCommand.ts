import {
  CommandType,
} from './CommandType';
import {
  RuntimeObject,
} from './Object';

export class RuntimeControlCommand extends RuntimeObject {
  constructor(
    public readonly commandType: CommandType = CommandType.NotSet,
  )
  {
    super();
  }

  public readonly Copy = (): RuntimeControlCommand => (
    new RuntimeControlCommand(this.commandType)
  );

  // The following static factory methods are to make generating these objects
  // slightly more succinct. Without these, the code gets pretty massive! e.g.
  //
  //     var c = new Runtime.ControlCommand(Runtime.ControlCommand.CommandType.EvalStart)
  // 
  // as opposed to
  //
  //     var c = Runtime.ControlCommand.EvalStart()

  public static readonly EvalStart = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.EvalStart)
  );

  public static readonly EvalOutput = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.EvalOutput)
  );

  public static readonly EvalEnd = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.EvalEnd)
  );

  public static readonly Duplicate = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.Duplicate)
  );

  public static readonly PopEvaluatedValue = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.PopEvaluatedValue)
  );

  public static readonly PopFunction = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.PopFunction)
  );

  public static readonly PopTunnel = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.PopTunnel)
  )
      
  public static readonly BeginString = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.BeginString)
  );

  public static readonly EndString = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.EndString)
  );

  public static readonly NoOp = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.NoOp)
  );

  public static readonly ChoiceCount = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.ChoiceCount)
  );

  public static readonly Turns = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.Turns)
  );

  public static readonly TurnsSince = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.TurnsSince)
  );

  public static readonly ReadCount = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.ReadCount)
  );

  public static readonly Random = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.Random)
  );

  public static readonly SeedRandom = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.SeedRandom)
  );

  public static readonly VisitIndex = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.VisitIndex)
  );

  public static readonly SequenceShuffleIndex = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.SequenceShuffleIndex)
  );

  public static readonly StartThread = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.StartThread)
  );

  public static readonly Done = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.Done)
  );

  public static readonly End = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.End)
  );

  public static readonly ListFromInt = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.ListFromInt)
  );

  public static readonly ListRange = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.ListRange)
  );

  public static readonly ListRandom = (): RuntimeControlCommand => (
    new RuntimeControlCommand(CommandType.ListRandom)
  );

  public readonly ToString = (): string => (
    String(this.commandType)
  );
}

