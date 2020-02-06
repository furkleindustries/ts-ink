export var CommandType;
(function (CommandType) {
    CommandType[CommandType["NotSet"] = -1] = "NotSet";
    CommandType[CommandType["EvalStart"] = 0] = "EvalStart";
    CommandType[CommandType["EvalOutput"] = 1] = "EvalOutput";
    CommandType[CommandType["EvalEnd"] = 2] = "EvalEnd";
    CommandType[CommandType["Duplicate"] = 3] = "Duplicate";
    CommandType[CommandType["PopEvaluatedValue"] = 4] = "PopEvaluatedValue";
    CommandType[CommandType["PopFunction"] = 5] = "PopFunction";
    CommandType[CommandType["PopTunnel"] = 6] = "PopTunnel";
    CommandType[CommandType["BeginString"] = 7] = "BeginString";
    CommandType[CommandType["EndString"] = 8] = "EndString";
    CommandType[CommandType["NoOp"] = 9] = "NoOp";
    CommandType[CommandType["ChoiceCount"] = 10] = "ChoiceCount";
    CommandType[CommandType["Turns"] = 11] = "Turns";
    CommandType[CommandType["TurnsSince"] = 12] = "TurnsSince";
    CommandType[CommandType["ReadCount"] = 13] = "ReadCount";
    CommandType[CommandType["Random"] = 14] = "Random";
    CommandType[CommandType["SeedRandom"] = 15] = "SeedRandom";
    CommandType[CommandType["VisitIndex"] = 16] = "VisitIndex";
    CommandType[CommandType["SequenceShuffleIndex"] = 17] = "SequenceShuffleIndex";
    CommandType[CommandType["StartThread"] = 18] = "StartThread";
    CommandType[CommandType["Done"] = 19] = "Done";
    CommandType[CommandType["End"] = 20] = "End";
    CommandType[CommandType["ListFromInt"] = 21] = "ListFromInt";
    CommandType[CommandType["ListRange"] = 22] = "ListRange";
    CommandType[CommandType["ListRandom"] = 23] = "ListRandom";
    //----
    CommandType[CommandType["TOTAL_VALUES"] = 24] = "TOTAL_VALUES";
})(CommandType || (CommandType = {}));
//# sourceMappingURL=CommandType.js.map