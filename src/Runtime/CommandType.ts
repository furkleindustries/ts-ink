export enum CommandType {
  NotSet = -1,
  EvalStart,
  EvalOutput,
  EvalEnd,
  Duplicate,
  PopEvaluatedValue,
  PopFunction,
  PopTunnel,
  BeginString,
  EndString,
  NoOp,
  ChoiceCount,
  Turns,
  TurnsSince,
  ReadCount,
  Random,
  SeedRandom,
  VisitIndex,
  SequenceShuffleIndex,
  StartThread,
  Done,
  End,
  ListFromInt,
  ListRange,
  ListRandom,
  //----
  TOTAL_VALUES
}
