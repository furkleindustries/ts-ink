import * as fs from 'fs';
import * as path from 'path';

import {
  InkParser,
  RuntimeStory as Story,
  StringParser,
} from '../dist';
import {
  CommentEliminator,
} from '../dist/Compiler/Parser/CommentEliminator';
import {
  ErrorType,
} from '../dist/Compiler/Parser/ErrorType';
import {
  RuntimePath as Path,
} from '../dist/Runtime/Path';

let _authorMessages = [];
let _errorMessages = [];
let _warningMessages = [];

// Helper compile function
const CompileString = (
  str,
  countAllVisits = false,
  mode = 'jsonRoundtrip',
) => {
  const parser = new InkParser(str, TestErrorHandler);

  const parsedStory = parser.Parse();
  parsedStory.countAllVisits = countAllVisits;

  let story = parsedStory.ExportRuntime(TestErrorHandler);
  if (!story) {
    throw new Error('Story was exported as null in test.');
  }

  // Convert to json and back again
  if (mode === 'jsonRoundtrip') {
    const jsonStr = story.ToJson();
    story = new Story(jsonStr);
  }

  return story;
};

const CompileStringWithoutRuntime = (
  str,
) => {
  const parser = new InkParser(str, null, TestErrorHandler);
  var parsedStory = parser.Parse();

  if (!parsedStory) {
    throw new Error('Encountered error in creating story.')
  } else if (parsedStory.hadError) {
    throw new Error('Encountered error in generating story.');
  }
  
  if (parsedStory && !parsedStory.hadError && !_errorMessages.length) {
    parsedStory.ExportRuntime(TestErrorHandler);
  }

  return parsedStory;
};

const HadErrorOrWarning = (matchStr, list) => {
  if (!matchStr) {
    return Boolean(list.length);
  }

  for (let ii = 0; ii < list.length; ii += 1) {
    if (str.includes(matchStr)) {
      return true;
    }
  }

  return false;
};

const HadError = (matchStr = '') => (
  HadErrorOrWarning(matchStr, _errorMessages)
);

const HadWarning = (matchStr = '') => (
  HadErrorOrWarning(matchStr, _warningMessages)
);

const TestErrorHandler = (message, errorType) => {
  if (errorType === ErrorType.Error) {
    _errorMessages.push(message);
  } else if (errorType === ErrorType.Warning) {
    _warningMessages.push(message);
  } else if (errorType === ErrorType.Author) {
    _authorMessages.push(message);
  } else {
    throw new Error(message);
  }
};

const GenerateIdentifierFromCharacterRange = (
  range,
  varNameUniquePart = '',
) => {
  let str = '';
  if (varNameUniquePart) {
    str += varNameUniquePart;
  }

  const charset = range.ToCharacterSet();

  Array.from(charset.set).forEach((c) => {
    str += c;
  });

  return str;
};

describe('All tests provided by Inkle in the Ink repo..', () => {
  beforeEach(() => {
    _authorMessages = [];
    _errorMessages = [];
  });

  it('Tests hello world.', () => {
    const story = CompileString('Hello world');
    Assert.AreEqual("Hello world\n", story.Continue());
  });

  it('Tests argument name collisions.', () => {
    const storyStr = 
      ```
      VAR global_var = 5

      ~ pass_divert(-> knot_name)
      {variable_param_test(10)}

      === function aTarget() ===
      ~ return true

      === function pass_divert(aTarget) ===
      Should be a divert target, but is a read count:- {aTarget}

      === function variable_param_test(global_var) ===
      ~ return global_var

      === knot_name ===
      -> END
      ```;
    
    CompileStringWithoutRuntime(storyStr);

    expect(_errorMessages.length).toBe(2);
    expect(HadError('name has already been used for a function')).toBe(true);
    expect(HadError('name has already been used for a var')).toBe(true);
  });

  it('Arguments do not conflict with gathers elsewhere.', () => {
    const storyStr = 
      ```
      == knot ==
      - (x) -> DONE

      == function f(x) ==
      Nothing
      ```;

    // Testing that there are no errors only
    CompileStringWithoutRuntime(storyStr);

    expect(_errorMessages.length).toBe(0);
  });

  it('Tests arithmetic.', () => {
    const storyStr = 
      ```
      { 2 * 3 + 5 * 6 }
      {8 mod 3}
      {13 % 5}
      { 7 / 3 }
      { 7 / 3.0 }
      { 10 - 2 }
      { 2 * (5-1) }
      ```;

    story = CompileString(storyStr);

    const expected = `36\n2\n3\n2\n2.333333\n8\n8\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });;

  it('Tests basic string literals.', () => {
    const storyStr = 
      ```
      VAR x = ""Hello world 1""
      {x}
      Hello {""world""} 2.
      ```;

    const story = CompileString(storyStr);
    const expected = `Hello world 1\nHello world 2.\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests basic tunnels.', () => {
    const storyStr = 
      ```
      -> f ->
      <> world

      == f ==
      Hello
      ->->
      ```;

    const story = CompileString(storyStr);

    expect("Hello world\n".toBe(story.Continue()));
  });

  it('Tests blanks in inline sequences.', () => {
    const storyStr = 
      ```
      1. -> seq1 ->
      2. -> seq1 ->
      3. -> seq1 ->
      4. -> seq1 ->
      \---
      1. -> seq2 ->
      2. -> seq2 ->
      3. -> seq2 ->
      \---
      1. -> seq3 ->
      2. -> seq3 ->
      3. -> seq3 ->
      \---
      1. -> seq4 ->
      2. -> seq4 ->
      3. -> seq4 ->

      == seq1 ==
      {a||b}
      ->->

      == seq2 ==
      {|a}
      ->->

      == seq3 ==
      {a|}
      ->->

      == seq4 ==
      {|}
      ->->
      ```.replace(new RegExp(/\r/g), ''),

    const story = CompileString(storyStr);

    const expected = ```
      1. a
      2.
      3. b
      4. b
      ---
      1.
      2. a
      3. a
      ---
      1. a
      2.
      3.
      ---
      1.
      2.
      3.
      ```.replace(new RegExp(/\r/g), '');

    const found = story.ContinueMaximally().replace(new RegExp(/\r/g), '');

    expect(expected).toBe(found);
  });

  it('Tests all sequence types.', () => {
    const storyStr = ```
      ~ SEED_RANDOM(1)

      Once: {f_once()} {f_once()} {f_once()} {f_once()}
      Stopping: {f_stopping()} {f_stopping()} {f_stopping()} {f_stopping()}
      Default: {f_default()} {f_default()} {f_default()} {f_default()}
      Cycle: {f_cycle()} {f_cycle()} {f_cycle()} {f_cycle()}
      Shuffle: {f_shuffle()} {f_shuffle()} {f_shuffle()} {f_shuffle()}
      Shuffle stopping: {f_shuffle_stopping()} {f_shuffle_stopping()} {f_shuffle_stopping()} {f_shuffle_stopping()}
      Shuffle once: {f_shuffle_once()} {f_shuffle_once()} {f_shuffle_once()} {f_shuffle_once()}

      == function f_once ==
      {once:
      - one
      - two
      }

      == function f_stopping ==
      {stopping:
      - one
      - two
      }

      == function f_default ==
      {one|two}

      == function f_cycle ==
      {cycle:
      - one
      - two
      }

      == function f_shuffle ==
      {shuffle:
      - one
      - two
      }

      == function f_shuffle_stopping ==
      {stopping shuffle:
      - one
      - two
      - final
      }

      == function f_shuffle_once ==
      {shuffle once:
      - one
      - two
      }
    ```;

    const expected = `Once: one two\nStopping: one two two two\nDefault: one two two two\nCycle: one two one two\nShuffle: two one two one\nShuffle stopping: one two final final\nShuffle once: two one\n`;
    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests call stack evaluation.', () => {
    const storyStr =
      ```
      { six() + two() }
      -> END

      === function six
          ~ return four() + two()

      === function four
          ~ return two() + two()

      === function two
          ~ return 2
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('8\n');
  });

  it('Tests choice counts.', () => {
    const storyStr = 
      ```
      <- choices
      { CHOICE_COUNT() }

      = end
      -> END

      = choices
      * one -> end
      * two -> end
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('2\n');
  });

  it('Tests choice diverts to done.', () => {
    const story = CompileString(`* choice -> DONE`);
    story.Continue();

    expect(story.currentChoices.length).toBe(1);
    story.ChooseChoiceIndex(0);

    expect(story.Continue()).toBe('choice');
    expect(story.hasError).toBeFalsy();
  });

  it('Tests choice with brackets only', () => {
    const storyStr = `*   [Option]\n    Text`;
    const story = CompileString(storyStr);

    story.Continue();

    expect(story.currentChoices.Count).toBe(1);
    expect(story.currentChoices[0].text).toBe('Option');

    story.ChooseChoiceIndex(0);

    expect(story.Continue()).toBe('Text\n');
  });

  it('Tests the comment eliminator.', () => {
    const testContent =
      ```
      A// C
      A /* C */ A

      A * A * /* * C *// A/*
      C C C

      */
      ```;

    const p = new CommentEliminator(testContent);
    const result = p.Process();
    const expected = `A\nA  A\n\nA * A * / A\n\n\n`.replace(/\r/g, '');

    expect(expected).toBe(result.replace(/\r/g, ''));
  });

  //------------------------------------------------------------------------
  it('Tests comment elimination with mixed newlines.', () => {
    const testContent = `A B\nC D // comment\nA B\r\nC D // comment\r\n/* block comment\r\nsecond line\r\n */ `;

    const p = new CommentEliminator(testContent);
    const result = p.Process();
    const expected = `A B\nC D \nA B\nC D \n\n\n `;

    expect(result).toBe(expected);
  });

  it('Tests comparing divert targets.', () => {
    const storyStr =
      ```
      VAR to_one = -> one
      VAR to_two = -> two

      {to_one == to_two:same knot|different knot}
      {to_one == to_one:same knot|different knot}
      {to_two == to_two:same knot|different knot}
      { -> one == -> two:same knot|different knot}
      { -> one == to_one:same knot|different knot}
      { to_one == -> one:same knot|different knot}

      == one
      One
      -> DONE

      === two
      Two
      -> DONE
      ```;

    const story = CompileString(storyStr);
    const expected = `different knot\nsame knot\nsame knot\ndifferent knot\nsame knot\nsame knot\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests complex tunnels.', () => {
    const storyStr = 
      ```
      -> one (1) -> two (2) ->
      three (3)

      == one(num) ==
      one ({num})
      -> oneAndAHalf (1.5) ->
      ->->

      == oneAndAHalf(num) ==
      one and a half ({num})
      ->->

      == two (num) ==
      two ({num})
      ->->
      ```;

    const story = CompileString(storyStr);
    const expected = `one (1)\none and a half (1.5)\ntwo (2)\nthree (3)\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests conditional choices in weaves.', () => {
    const storyStr =
      ```
      - start
      {
      - true: * [go to a stitch] -> a_stitch
      }
      - gather should be seen
      -> DONE

      = a_stitch
      result
      -> END
      ```;

    const story = CompileString(storyStr);

    let expected = `start\ngather should be seen\n`
    expect(story.ContinueMaximally()).toBe(expected);
    expect(story.currentChoices.length).toBe(1);

    story.ChooseChoiceIndex(0);

    expected = `result\n`;

    expect(story.Continue()).toBe(expected);
  });

  it('Also tests conditional choices in weaves.', () => {
    const storyStr =
      ```
      - first gather
      * [option 1]
      * [option 2]
      - the main gather
      {false:
      * unreachable option -> END
      }
      - bottom gather
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('first gather\n');
    expect(story.currentChoices.length).toBe(2);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally(), 'the main gather\nbottom gather\n');
    expect(story.currentChoices.length).toBe(0);
  });

  it('Tests conditional choices.', () => {
    const storyStr =
      ```
      * { true } { false } not displayed
      * { true } { true }
      { true and true }  one
      * { false } not displayed
      * (name) { true } two
      * { true }
      { true }
      three
      * { true }
      four
      ```;

    const story = CompileString(storyStr);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(4);
    expect(story.currentChoices[0].text).toBe('one');
    expect(story.currentChoices[1].text).toBe('two');
    expect(story.currentChoices[2].text).toBe('three');
    expect(story.currentChoices[3].text).toBe('four');
  });

  it('Tests conditionals.', () => {
    const storyStr =
      ```
      {false:not true|true}
      {
      - 4 > 5: not true
      - 5 > 4: true
      }
      { 2*2 > 3:
      - true
      - not true
      }
      {
      - 1 > 3: not true
      - { 2+2 == 4:
          - true
          - not true
      }
      }
      { 2*3:
      - 1+7: not true
      - 9: not true
      - 1+1+1+3: true
      - 9-3: also true but not printed
      }
      { true:
      great
      right?
      }
      ```;

    const story = CompileString(storyStr);
    const expected = `true\ntrue\ntrue\ntrue\ntrue\ngreat\nright?\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests const declarations.', () => {
    const storyStr =
      ```
      VAR x = c

      CONST c = 5

      {x}
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('5\n');
  });

  it('Tests default choices.', () => {
    const storyStr =
      ```
      - (start)
      * [Choice 1]
      * [Choice 2]
      * {false} Impossible choice
      * -> default
      - After choice
      -> start

      == default ==
      This is default.
      -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('');
    expect(story.currentChoices.length).toBe(2);

    story.ChooseChoiceIndex(0);

    expect(story.Continue()).toBe('After choice\n');
    expect(story.currentChoices.length).toBe(1);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe('After choice\nThis is default.\n');
  });

  it('Tests default simple gathers.', () => {
    const storyStr =
      ```
      * ->
      - x
      -> DONE
      ```

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('x\n');
  });

  it('Tests diverts in conditionals.', () => {
    const storyStr =
      ```
      === intro
      = top
      { main: -> done }
      -> END
      = main
      -> top
      = done
      -> END
      ```;

    const story = CompileString(storyStr);
    expect(story.ContinueMaximally()).toBe('');
  });

  it('Tests DivertNotFoundError.', () => {
    const storyStr = 
      ```
      -> knot

      == knot ==
      Knot.
      -> next
      ```;

    CompileStringWithoutRuntime(storyStr, true);

    expect(HadError('not found')).toBe(true);
  });

  it('Tests diverts to weave points.', () => {
    const storyStr =
      ```
      -> knot.stitch.gather

      == knot ==
      = stitch
      - hello
      * (choice) test
      choice content
      - (gather)
      gather

      {stopping:
      - -> knot.stitch.choice
      - second time round
      }

      -> END
      ```;

    const story = CompileString(storyStr);
    const expected = `gather\ntest\nchoice content\ngather\nsecond time round\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests else branches.', () => {
    const storyStr =
      ```
      VAR x = 3

      {
      - x == 1: one
      - x == 2: two
      - else: other
      }

      {
      - x == 1: one
      - x == 2: two
      - other
      }

      { x == 4:
      - The main clause
      - else: other
      }

      { x == 4:
      The main clause
      - else:
      other
      }
      ```;

    const story = CompileString(storyStr);
    const expected = `other\nother\nother\nother\n`;

    expect(story.currentText).toBe(expected);
  });

  it('Tests empty strings.', () => {
    const story = CompileString('');
    expect(story.currentText).toBe('');
    expect(story.currentChoices.length).toBe(0);
  });

  it('Tests empty choices.', () => {
    let warningCount = 0;
    const parser = new InkParser(
      '*',
      null,
      (message, errorType) => {
        if (errorType === ErrorType.Warning) {
          warningCount += 1;
          expect(message.includes('completely empty')).toBe(true);
        }
      },
    );

    parser.Parse();

    expect(warningCount).toBe(1);
  });

  it('Tests empty multiline conditional branches.', () => {
    var story = CompileString(
      ```
      { 3:
      - 3:
      - 4:
        txt
      }
      ```,
    );

    expect(story.Continue()).toBe('');
  });


  it('Tests that failure on all switch branches is clean.', () => {
    const story = CompileString (
      ```
      { 1:
      - 2: x
      - 3: y
      }
      ```,
    );

    story.Continue ();

    expect(story.state.evaluationStack.length).toBe(0);
  });

  it ('Tests trivial conditions.', () => {
    const story = CompileString (
      ```
      {
      - false:
      beep
      }
      ```,
    );

    story.Continue();

    expect(story.hasError).toBeFalsy();
  });

  it('Tests empty sequence content.', () => {
    const story = CompileString(
      ```
      -> thing ->
      -> thing ->
      -> thing ->
      -> thing ->
      -> thing ->
      Done.

      == thing ==
      {once:
      - Wait for it....
      -
      -
      -  Surprise!
      }
      ->->
      ```,
    );

    const expected = `Wait for it....\nSurprise!\nDone.\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests END.', () => {
    const story = CompileString(
      ```
      hello
      -> END
      world
      -> END
      ```
    );

    expect(story.ContinueMaximally()).toBe('hello\n');
  });

  it('Also tests END.', () => {
    const story = CompileString(
      ```
      -> test

      == test ==
      hello
      -> END
      world
      -> END
      ```,
    );

    expect(story.ContinueMaximally()).toBe("hello\n");
  });

  it('Tests end of content.', () => {
    let story = CompileString(`Hello world`, false, true);

    story.ContinueMaximally();

    expect(HadError()).toBeFalsy();

    story = CompileString(`== test ==\nContent\n-> END`);

    story.ContinueMaximally();

    expect(story.hasError).toBeFalsy();

    // Should have runtime error due to running out of content
    // (needs a -> END)
    story = CompileString(`== test ==\nContent`, false, true);

    story.ContinueMaximally();

    expect(HadWarning()).toBe(true);

    // Should have warning that there's no "-> END"
    CompileStringWithoutRuntime(
      `== test ==\nContent`,
      true,
    );

    expect(HadError()).toBeFalsy();
    expect(HadWarning()).toBe(true);

    CompileStringWithoutRuntime(`== test ==\n~return`, true);

    expect(
      HadError('Return statements can only be used in knots that are declared as functions'),
    ).toBe(true);

    CompileStringWithoutRuntime(`== function test ==\n-> END`, true);

    expect(HadError('Functions may not contain diverts')).toBe(true);
  });

  it('Tests escape character.', () => {
    const storyStr = `{true:this is a '\|' character|this isn't}`;
    const story = CompileString(storyStr);
    const expected = `this is a '|' character\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests external binding.', () => {
    var story = CompileString(
      ```
      EXTERNAL message(x)
      EXTERNAL multiply(x,y)
      EXTERNAL times(i,str)
      ~ message(""hello world"")
      {multiply(5.0, 3)}
      {times(3, ""knock "")}
      ```
    );

    let message = '';

    story.BindExternalFunction('message', (arg) => {
      message = `MESSAGE: ${arg}`;
    });

    story.BindExternalFunction('multiply', (arg1, arg2) => {
      return arg1 * arg2;
    });

    story.BindExternalFunction('times', (numberOfTimes, str) => {
      let result = '';
      for (let ii = 0; ii < numberOfTimes; ii += 1) {
        result += str;
      }

      return result;
    });

    expect(story.Continue()).toBe('15\n');
    expect(story.Continue()).toBe('knock knock knock\n');
    expect(message).toBe('MESSAGE: hello world');
  });

  it('Tests factorial by reference.', () => {
    const storyStr =
      ```
      VAR result = 0
      ~ factorialByRef(result, 5)
      { result }

      == function factorialByRef(ref r, n) ==
      { r == 0:
      ~ r = 1
      }
      { n > 1:
      ~ r = r * n
      ~ factorialByRef(r, n-1)
      }
      ~ return
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('120\n');
  });

  it('Tests factorial recursive.', () => {
    const storyStr = 
      ```
      { factorial(5) }

      == function factorial(n) ==
      { n == 1:
        ~ return 1
      - else:
        ~ return (n * factorial(n-1))
      }
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('120\n');
  });

  it('Tests function call restrictions.', () => {
    CompileStringWithoutRuntime(
      ```
      // Allowed to do this
      ~ myFunc()

      // Not allowed to to this
      ~ aKnot()

      // Not allowed to do this
      -> myFunc

      == function myFunc ==
      This is a function.
      ~ return

      == aKnot ==
      This is a normal knot.
      -> END
      ```,
      true,
    );

    expect(_errorMessages.length).toBe(2);
    expect(_errorMessages[0].includes('hasn\'t been marked as a function')).toBe(true);
    expect(_errorMessages[1].includes('can only be called as a function')).toBe(true);
  });

  it('Tests function purity checks.', () => {
    CompileStringWithoutRuntime(
      ```
      -> test

      == test ==
      ~ myFunc()
      = function myBadInnerFunc
      Not allowed!
      ~ return

      == function myFunc ==
      Hello world
      * a choice
      * another choice
      - 
      -> myFunc
      = testStitch
      This is a stitch
      ~ return
      ```,
      true,
    );

    expect(_errorMessages.length).toBe(7);
    expect(_errorMessages[0].includes('Return statements can only be used in knots that'));
    expect(_errorMessages[1].includes('Functions cannot be stitches'));
    expect(_errorMessages[2].includes('Functions may not contain stitches'));
    expect(_errorMessages[3].includes('Functions may not contain diverts'));
    expect(_errorMessages[4].includes('Functions may not contain choices'));
    expect(_errorMessages[5].includes('Functions may not contain choices'));
    expect(_errorMessages[6].includes('Return statements can only be used in knots that'));
  });

  it('Tests disallowed empty diverts.', () => {
    CompileStringWithoutRuntime(`->`);
    expect(HadError('Empty diverts (->) are only valid on choices')).toBe(true);
  });

  it('Tests gathers and choice on the same line.', () => {
    const storyStr = `- * hello\n- * world`;

    const story = CompileString(storyStr);
    story.Continue();

    expect(story.currentChoices[0].text).toBe('hello');

    story.ChooseChoiceIndex(0);
    story.Continue();

    expect(story.currentChoices[0].text).toBe('world');
  });

  it('Tests gather read counts with initial sequences.', () => {
    const storyStr = 
      ```
      - (opts)
      {test:seen test}
      - (test)
      { -> opts |}
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('seen test\n');
  });

  it('Test has read on choice.', () => {
    const storyStr =
      ```
      * { not test } visible choice
      * { test } visible choice

      == test ==
      -> END
      ```;

    const story = CompileString(storyStr);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe('visible choice');
  });

  it('Tests that identifers can start with numbers.', () => {
    const storyStr =
      ```
      -> 2tests
      == 2tests ==
      ~ temp 512x2 = 512 * 2
      ~ temp 512x2p2 = 512x2 + 2
      512x2 = {512x2}
      512x2p2 = {512x2p2}
      -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('512x2 = 1024\n512x2p2 = 1026\n');
  });

  it ('Tests implicit inline glue.', () => {
    const storyStr =
      ``` 
      I have {five()} eggs.

      == function five ==
      {false:
      Don't print this
      }
      five
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('I have five eggs.\n');
  });

  it('Also tests implicit inline glue.', () => {
    const storyStr =
      ```
      A {f():B} 
      X

      === function f() ===
      {true: 
        ~ return false
      }
      ```

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('A\nX\n');
  });

  it('Also also test implicit inline glue.', () => {
    const storyStr =
      ```
      A
      {f():X}
      C

      === function f()
      { true: 
        ~ return false
      }
    ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`A\nC\n`);
  });

  it('Tests includes.', () => {
    const storyStr =
      ```
      INCLUDE test_included_file.ink
      INCLUDE test_included_file2.ink

      This is the main file.
      ```;

    const story = CompileString(storyStr);
    const expected = 'This is include 1.\nThis is include 2.\nThis is the main file.\n';

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests incrementing.', () => {
    const storyStr =
      ```
      VAR x = 5
      ~ x++
      {x}

      ~ x--
      {x}
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('6\n5\n');
  });

  it('Tests knot dot gathers.', () => {
    const storyStr =
      ```
      -> knot
      === knot
      -> knot.gather
      - (gather) g
      -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('g\n');
  });

  // Although VAR and CONST declarations are parsed as being
  // part of the knot, they're extracted, so that the null
  // termination detection shouldn't see this as a loose end.
  it('Tests knot termination and skips global objects.', () => {
    const storyStr = 
      ```
      === stuff ===
      -> END

      VAR X = 1
      CONST Y = 2
      ```;

    CompileStringWithoutRuntime(storyStr);

    expect(_warningMessages.length).toBe(0);
  });


  it('Tests loose ends.', () => {
    const storyStr = 
      ```
      No loose ends in main content.

      == knot1 ==
      * loose end choice
      * loose end
      on second line of choice

      == knot2 ==
      * A
      * B
      TODO: Fix loose ends but don't warn

      == knot3 ==
      Loose end when there's no weave

      == knot4 ==
      {true:
      {false:
        Ignore loose end when there's a divert
        in a conditional.
        -> knot4
      }
      }
      ```;

    CompileStringWithoutRuntime(storyStr);

    expect(_warningMessages.length).toBe(3);
    expect(HadWarning('line 4: Apparent loose end')).toBe(true);
    expect(HadWarning('line 6: Apparent loose end')).toBe(true);
    expect(HadWarning('line 14: Apparent loose end')).toBe(true);
    expect(_authorMessages.length).toBe(1);
  });

  it('Tests knot-thread interactions.', () => {
    const storyStr =
      ```
      -> knot
      === knot
      <- threadB
      -> tunnel ->
      THE END
      -> END

      === tunnel
      - blah blah
      * wigwag
      - ->->

      === threadB
      * option
      - something
        -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('blah blah\n');
    expect(story.currentChoices.length).toBe(2);
    expect(story.currentChoices[0].text.Contains("option")).toBe(true);
    expect(story.currentChoices[1].text.Contains("wigwag")).toBe(true);

    story.ChooseChoiceIndex(1);

    expect(story.Continue()).toBe('wigwag\n');
    expect(story.Continue()).toBe('THE END\n');
    expect(story.hasError).toBeFalsy();
  });

  it('Tests knot-thread interaction.', () => {
    const storyStr =
      ```
      -> knot
      === knot
      <- threadA
      When should this get printed?
      -> DONE
      
      === threadA
      -> tunnel ->
      Finishing thread.
      -> DONE
      
      === tunnel
      -   I'm in a tunnel
      *   I'm an option
      -   ->->
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('I\'m in a tunnel\nWhen should this get printed?\n');
    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe('I\'m an option');

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe('I\'m an option\nFinishing thread.\n');
    expect(story.hasError).toBeFalsy();
  });

  it('Tests multiline sequences with leading newlines.', () => {
    const storyStr = 
      ```
      {stopping:

      - a line after an empty line
      - blah
      }
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('a line after an empty line\n');
  });

  it('Tests literal unaries.', () => {
    const storyStr =   
      ```
      VAR negativeLiteral = -1
      VAR negativeLiteral2 = not not false
      VAR negativeLiteral3 = !(0)

      {negativeLiteral}
      {negativeLiteral2}
      {negativeLiteral3}
      ```;
    
    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`-1\n0\n1\n`);
  });

  it('Tests logic in choices.', () => {
    const storyStr = 
      ```
      * 'Hello {name()}[, your name is {name()}.'],' I said, knowing full well that his name was {name()}.
      -> DONE

      == function name ==
      Joe
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();

    expect(story.currentChoices[0].text).toBe(`'Hello Joe, your name is Joe.'`);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`'Hello Joe,' I said, knowing full well that his name was Joe.\n`);
  });

  it('Tests multiple constant references.', () => {
    const storyStr = 
      ```
      CONST CONST_STR = ""ConstantString""
      VAR varStr = CONST_STR
      {varStr == CONST_STR:success}
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('success\n');
  });

  it('Tests multi-threads.', () => {
    const storyStr = 
      ```
      -> start
      == start ==
      -> tunnel ->
      The end
      -> END

      == tunnel ==
      <- place1
      <- place2
      -> DONE

      == place1 ==
      This is place 1.
      * choice in place 1
      - ->->

      == place2 ==
      This is place 2.
      * choice in place 2
      - ->->
      ```;

    const story = CompileString(storyStr);

    expect("This is place 1.\nThis is place 2.\n", story.ContinueMaximally());

    story.ChooseChoiceIndex(0);

    expect("choice in place 1\nThe end\n", story.ContinueMaximally());
    expect(story.hasError).toBeFalsy();
  });

  expect('Test nested includes.', () => {
    const storyStr =
      ```
      INCLUDE test_included_file3.ink

      This is the main file

      -> knot_in_2
      ```;

    const story = CompileString(storyStr);

    const expected = `The value of a variable in test file 2 is 5.\nThis is the main file\nThe value when accessed from knot_in_2 is 5.\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests nested pass-by-reference.', () => {
    const storyStr =
      ```
      VAR globalVal = 5

      {globalVal}

      ~ squaresquare(globalVal)

      {globalVal}

      == function squaresquare(ref x) ==
      {square(x)} {square(x)}
      ~ return

      == function square(ref x) ==
      ~ x = x * x
      ~ return
      ```;

    const story = CompileString(storyStr);

    // Bloody whitespace
    expect(story.ContinueMaximally()).toBe('5\n625\n');
  });

  it('Tests non-text in choice inner content.', () => {
    const storyStr =
      ```
      -> knot
      == knot
      *   option text[]. {true: Conditional bit.} -> next
      -> DONE

      == next
      Next.
      -> DONE
      ```;

    const story = CompileString(storyStr);

    story.Continue();
    story.ChooseChoiceIndex(0);

    const expected = `option text. Conditional bit. Next.\n`;
    expect(story.Continue()).toBe(expected);
  });

  it('Tests that once-only choices can link back to themselves.', () => {
    const storyStr =
      ```
      -> opts
      = opts
      *   (firstOpt) [First choice]   ->  opts
      *   {firstOpt} [Second choice]  ->  opts
      * -> end

      - (end)
      -> END
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(1);
    expect('First choice', story.currentChoices[0].text);

    story.ChooseChoiceIndex(0);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe('Second choice');

    story.ChooseChoiceIndex(0);
    story.ContinueMaximally();

    expect(null, story.currentErrors);
  });

  it('Tests once-only choices with own content.', () => {
    const storyStr = 
      ```
      VAR times = 3
      -> home

      == home ==
      ~ times = times - 1
      {times >= 0:-> eat}
      I've finished eating now.
      -> END

      == eat ==
      This is the {first|second|third} time.
      * Eat ice-cream[]
      * Drink coke[]
      * Munch cookies[]
      -
      -> home
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(3);

    story.ChooseChoiceIndex(0);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(2);

    story.ChooseChoiceIndex(0);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(1);

    story.ChooseChoiceIndex(0);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(0);
  });

  it('Test the Path object.', () => {
    // Different instances should ensure different instances of individual components
    const path1 = new Path({ componentsString: 'hello.1.world' });
    const path2 = new Path({ componentsString: 'hello.1.world' });
    const path3 = new Path({ componentsString: '.hello.1.world' });
    const path4 = new Path({ componentsString: '.hello.1.world' });

    expect(path1.Equals(path2)).toBe(true);
    expect(path3.Equals(path4)).toBe(true);
    expect(path1 === path3).toBeFalsy();
  });

  it('Tests paths to self.', () => {
    const storyStr = 
      ```
      - (dododo)
      -> tunnel ->
      -> dododo

      == tunnel
      + A
      ->->
      ```;

    const func = () => {
      const story = CompileString(storyStr);
      // We're only checking that the story copes
      // okay without crashing
      // (internally the "-> dododo" ends up generating
      //  a very short path: ".^", and after walking into
      // the parent, it didn't cope with the "." before
      // I fixed it!)
      story.Continue();
      story.ChooseChoiceIndex(0);
      story.Continue();
      story.ChooseChoiceIndex(0);
    };

    expect(func).not.toThrow();
  });

  it('Tests printing numbers.', () => {
    const storyStr = 
      ```
      . {print_num(4)} .
      . {print_num(15)} .
      . {print_num(37)} .
      . {print_num(101)} .
      . {print_num(222)} .
      . {print_num(1234)} .
      
      === function print_num(x) ===
      {
      - x >= 1000:
          {print_num(x / 1000)} thousand { x mod 1000 > 0:{print_num(x mod 1000)}}
      - x >= 100:
          {print_num(x / 100)} hundred { x mod 100 > 0:and {print_num(x mod 100)}}
      - x == 0:
          zero
      - else:
          { x >= 20:
              { x / 10:
                  - 2: twenty
                  - 3: thirty
                  - 4: forty
                  - 5: fifty
                  - 6: sixty
                  - 7: seventy
                  - 8: eighty
                  - 9: ninety
              }
              { x mod 10 > 0:<>-<>}
          }
          { x < 10 || x > 20:
              { x mod 10:
                  - 1: one
                  - 2: two
                  - 3: three
                  - 4: four
                  - 5: five
                  - 6: six
                  - 7: seven
                  - 8: eight
                  - 9: nine
              }
          - else:
              { x:
                  - 10: ten
                  - 11: eleven
                  - 12: twelve
                  - 13: thirteen
                  - 14: fourteen
                  - 15: fifteen
                  - 16: sixteen
                  - 17: seventeen
                  - 18: eighteen
                  - 19: nineteen
              }
          }
      }
      ```;

    const story = CompileString(storyStr);

    const re = new RegExp(/\r/g);

    const expected = 
      ```. four .
      . fifteen .
      . thirty-seven .
      . one hundred and one .
      . two hundred and twenty-two .
      . one thousand two hundred and thirty-four .
      ```.replace(re, '');

    const output = story.ContinueMaximally().replace(re, '');

    expect(output).toBe(expected);
  });

  it('Tests quote character significance.', () => {
    // Confusing escaping + ink! Actual ink string is:
    // My name is "{"J{"o"}e"}"
    //  - First and last quotes are insignificant - they're part of the content
    //  - Inner quotes are significant - they're part of the syntax for string expressions
    // So output is: My name is "Joe"
    const storyStr = `My name is ""{""J{""o""}e""}""`;
    const story = CompileString(storyStr);
    const expected = `My name is \"Joe\"\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests read counts across callstacks.', () => {
    const storyStr =
      ```
      -> first

      == first ==
      1) Seen first {first} times.
      -> second ->
      2) Seen first {first} times.
      -> DONE

      == second ==
      In second.
      ->->
      ```;

    const story = CompileString(storyStr);
    const expected = `1) Seen first 1 times.\nIn second.\n2) Seen first 1 times.\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests read count across threads.', () => {
    const storyStr = 
      ```
      -> top

      = top
      {top}
      <- aside
      {top}
      -> DONE

      = aside
      * {false} DONE
      - -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('1\n1\n');
  });

  it('Tests read count dot-separated paths.', () => {
    const storyStr = 
      ```
      -> hi ->
      -> hi ->
      -> hi ->

      { hi.stitch_to_count }

      == hi ==
      = stitch_to_count
      hi
      ->->
      ```;

    const story = CompileString(storyStr);

    const expected = `hi\nhi\nhi\n3\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests requiring variable targets with types (cf: ?).', () => {
    const storyStr = 
      ```
      -> test(-> elsewhere)

      == test(varTarget) ==
      -> varTarget ->
      -> DONE

      == elsewhere ==
      ->->
      ```;

    CompileStringWithoutRuntime(storyStr);

    expect(HadError('it should be marked as: ->')).toBe(true);
  });

  it('Tests returnTextWarning.', () => {
    const func = () => {
      new InkParser(
        `== test ==\n return something`,
        null,
        (message, errorType) => expect(errorType).toBe(ErrorType.Warning),
      );
    };

    expect(func).not.toThrow();
  });

  it('Tests that same-line diverts are inline.', () => {
    const storyStr = 
      ```
      -> hurry_home
      === hurry_home ===
      We hurried home to Savile Row -> as_fast_as_we_could

      === as_fast_as_we_could ===
      as fast as we could.
      -> DONE
      ```;

    const story = CompileString(storyStr);
    const expected = `We hurried home to Savile Row as fast as we could.\n`;

    expect(story.Continue()).toBe(expected);
  });

  it('Tests that gathers should not occur due to choices.', () => {
    const storyStr = 
      ```
      * opt
      - - text
      * * {false} impossible
      - gather
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();
    story.ChooseChoiceIndex(0);

    const expected = 'opt\ntext\n';

    // Shouldn't go to "gather"
    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests shuffle stack muddying.', () => {
    const storyStr = 
      ```
      * {condFunc()} [choice 1]
      * {condFunc()} [choice 2]
      * {condFunc()} [choice 3]
      * {condFunc()} [choice 4]

      === function condFunc() ===
      {shuffle:
      - ~ return false
      - ~ return true
      - ~ return true
      - ~ return false
      }
      ```;

    const story = CompileString(storyStr);

    story.Continue();

    expect(story.currentChoices.length).toBe(2);
  });

  it('Tests simple usage of glue.', () => {
    const storyStr = `Some <> \ncontent<> with glue.\n`;

    const story = CompileString(storyStr);
    const expected = `Some content with glue.\n`;

    expect(story.Continue()).toBe(expected);
  });

  it('Tests that sticky choices stay sticky.', () => {
    const storyStr = 
      ```
      -> test
      == test ==
      First line.
      Second line.
      + Choice 1
      + Choice 2
      - -> test
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();
    expect(story.currentChoices.length).toBe(2);

    story.ChooseChoiceIndex(0);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(2);
  });

  it('Tests string constants.', () => {
    const storyStr = 
      ```
      {x}
      VAR x = kX
      CONST kX = ""hi""
      ```;

    const story = CompileString(storyStr);
    const expected = 'hi\n';

    expect(story.Continue()).toBe(expected);
  });

  it('Tests StringParser on "A."', () => {
    const p = new StringParser('A');
    const results = p.Interleave(
      () => p.ParseString('A'),
      () => p.ParseString('B'),
    );

    const expected = [ 'A' ];

    expect(results).toEqual(expected);
  });

  it('Tests StringParser on "ABAB."', () => {
    const p = new StringParser('ABAB');
    const results = p.Interleave(
      () => p.ParseString('A'),
      () => p.ParseString('B'),
    );

    const expected = [ 'A', 'B', 'A', 'B', ];

    expect(results).toEqual(expected);
  });

  it('Tests StringParser with "ABA A (Optional)."', () => {
    const p = new StringParser('ABAA');
    const results = p.Interleave(
      () => p.ParseString('A'),
      p.Optional(() => p.ParseString('B')),
    );

    const expected = [ 'A', 'B', 'A', 'A', ];

    expect(results).toEqual(expected);
  });

  it('Also tests StringParser with "ABA A (Optional).', () => {
    const p = new StringParser('BABB');
    const results = p.Interleave(
      p.Optional(() => p.ParseString('A')),
      () => p.ParseString('B'),
    );

    const expected = [ 'B', 'A', 'B', 'B', ];

    expect(results).toBe(expected);
  });

  it('Tests StringParser with "B."', () => {
    const p = new StringParser("B");
    const result = p.Interleave(
      () => p.ParseString('A'),
      () => p.ParseString('B'),
    );

    expect(result).toBeNull();
  });

  it('Tests strings in choices.', () => {
    const storyStr = 
      ```
      * \ {""test1""} [""test2 {""test3""}""] {""test4""}
      -> DONE
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe(`test1 ""test2 test3""`);

    story.ChooseChoiceIndex(0);

    expect(story.Continue()).toBe(`test1 test4\n`);
  });

  it('Tests string type coercion.', () => {
    const storyStr = 
      ```
      {""5"" == 5:same|different}
      {""blah"" == 5:same|different}
      ```;

    const story = CompileString(storyStr);

    const expected = `same\ndifferent\n`;

    // Not sure that "5" should be equal to 5, but hmm.
    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests temporary variables set at the global scope.', () => {
    const storyStr =
      ```
      VAR x = 5
      ~ temp y = 4
      {x}{y}
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('54\n');
  });

  it('Tests thread doneness.', () => {
    const storyStr = 
      ```
      This is a thread example
      <- example_thread
      The example is now complete.
      
      == example_thread ==
      Hello.
      -> DONE
      World.
      -> DONE
      ```;

    const story = CompileString(storyStr);
    const expected = `This is a thread example\nHello.\nThe example is now complete.\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests tunnelling onwards after tunnels.', () => {
    const storyStr = 
      ```
      -> tunnel1 ->
      The End.
      -> END
      
      == tunnel1 ==
      Hello...
      -> tunnel2 ->->
      
      == tunnel2 ==
      ...world.
      ->->
      ```;

    const story = CompileString(storyStr);
    const expected = `Hello...\n...world.\nThe End.\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests tunnel vs. thread behaviour.', () => {
    const storyStr = 
      ```
      -> knot_with_options ->
      Finished tunnel.
      
      Starting thread.
      <- thread_with_options
      * E
      -
      Done.
      
      == knot_with_options ==
      * A
      * B
      -
      ->->
      
      == thread_with_options ==
      * C
      * D
      - -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally().includes('Finished tunnel')).toBeFalsy();

    // Choices should be A, B
    expect(story.currentChoices.length).toBe(2);

    story.ChooseChoiceIndex(0);

    // Choices should be C, D, E
    expect(story.ContinueMaximally().includes('Finished tunnel')).toBe(true);
    expect(story.currentChoices.length).toBe(3);

    story.ChooseChoiceIndex(2);

    expect(story.ContinueMaximally().includes('Done.')).toBe(true);
  });

  it('Tests TURNS_SINCE.', () => {
    const storyStr = 
      ```
      { TURNS_SINCE(-> test) }
      ~ test()
      { TURNS_SINCE(-> test) }
      * [choice 1]
      - { TURNS_SINCE(-> test) }
      * [choice 2]
      - { TURNS_SINCE(-> test) }

      == function test ==
      ~ return
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`-1\n0\n`);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`1\n`);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`2\n`);
  });

  it('Test nested usages of TURNS_SINCE.', () => {
    const storyStr = 
      ```
      -> empty_world
      === empty_world ===
      {TURNS_SINCE(-> then)} = -1
      * (then) stuff
          {TURNS_SINCE(-> then)} = 0
          * * (next) more stuff
              {TURNS_SINCE(-> then)} = 1
          -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`-1 = -1\n`);
    expect(story.currentChoices.length).toBe(1);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`stuff\n0 = 0\n`);
    expect(story.currentChoices.length).toBe(1);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`more stuff\n1 = 1\n`);
  });

  it('Test TURNS_SINCE with variable targets.', () => {
    const storyStr = 
      ```
      -> start
      
      === start ===
      {beats(-> start)}
      {beats(-> start)}
      *   [Choice]  -> next
      = next
      {beats(-> start)}
      -> END
      
      === function beats(x) ===
      ~ return TURNS_SINCE(x)
      ```;

    // Count all visits must be switched on for variable count targets
    const story = CompileString(storyStr, false, true);

    expect(story.ContinueMaximally()).toBe(`0\n0\n`);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`1\n`);
  });

  it('Tests unbalanced weave indentations.', () => {
    const storyStr = 
      ```
      * * * First
      * * * * Very indented
      - - End
      -> END
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe(`First`);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`First\n`);
    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe(`Very indented`);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`Very indented\nEnd\n`);
    expect(0, story.currentChoices.Count);
  });

  it('Tests variable declarations in conditionals.', () => {
    const storyStr =
      ```
      VAR x = 0
      {true:
      - ~ x = 5
      }
      {x}
      ```;

    const story = CompileString(storyStr);

    // Extra newline is because there's a choice object sandwiched there,
    // so it can't be absorbed :-/
    expect(story.Continue()).toBe(`5\n`);
  });

  it('Tests variable divert targets.', () => {
    const storyStr =
      ```
      VAR x = -> here

      -> there

      == there ==
      -> x

      == here ==
      Here.
      -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe(`Here.\n`);
  });

  it('Tests the variable get and set API.', () => {
    const storyStr = 
      ```
      VAR x = 5

      {x}

      * [choice]
      -
      {x}

      * [choice]
      -

      {x}

      * [choice]
      -

      {x}

      -> DONE
      ```;

    const story = CompileString(storyStr);

    // Initial state
    expect(story.ContinueMaximally()).toBe(`5\n`);
    expect(story.variablesState.$('x')).toBe(5);

    story.variablesState.$('x', 10);
    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`10\n`);
    expect(story.variablesState.$('x')).toBe(10);

    story.variablesState.$('x', 8.5);
    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`8.5\n`);
    expect(story.variablesState.$('x')).toBe(8.5);

    story.variablesState.$('x', 'a string');
    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`a string\n`);
    expect(story.variablesState.$('x')).toBe(`a string`);
    expect(story.variablesState.$('z')).toBeNull();

    const func = () => {
      story.variablesState.$('x', new Date());
    };

    // Not allowed arbitrary types
    expect(func).toThrow();
  });

  it('Tests variable observers.', () => {
    const storyStr = 
      ```
      VAR testVar = 5
      VAR testVar2 = 10

      Hello world!

      ~ testVar = 15
      ~ testVar2 = 100

      Hello world 2!

      * choice

      ~ testVar = 25
      ~ testVar2 = 200

      -> END
      ```;

    const story = CompileString(storyStr);

    let currentVarValue = 0;
    let observerCallCount = 0;

    story.ObserveVariable('testVar', (varName, newValue) => {
      currentVarValue = Math.floor(newValue);
      observerCallCount += 1;
    });

    story.ContinueMaximally();

    expect(currentVarValue).toBe(15);
    expect(observerCallCount).toBe(1);
    expect(story.currentChoices.length).toBe(1);

    story.ChooseChoiceIndex(0);
    story.Continue();

    expect(currentVarValue).toBe(25);
    expect(observerCallCount).toBe(2);
  });

  it('Tests variable pointer refs from knots.', () => {
    const storyStr = 
      ```
      VAR val = 5

      -> knot ->

      -> END

      == knot ==
      ~ inc(val)
      {val}
      ->->

      == function inc(ref x) ==
      ~ x = x + 1
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe(`6\n`);
  });

  it('Tests variable swap with recursion.', () => {
    const storyStr = 
      ```
      ~ f(1, 1)

      == function f(x, y) ==
      { x == 1 and y == 1:
        ~ x = 2
        ~ f(y, x)
      - else:
        {x} {y}
      }
      ~ return
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`1 2\n`);
  });

  it('Tests variables in tunnels.', () => {
    const storyStr = 
      ```
      -> one_then_tother(-> tunnel)

      === one_then_tother(-> x) ===
      -> x -> end

      === tunnel ===
      STUFF
      ->->

      === end ===
      -> END
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`STUFF\n`);
  });

  it('Tests weaves with gathers.', () => {
    var storyStr =
      ```
      -
      * one
      * * two
      - - three
      *  four
      - - five
      - six
      ```;

    const story = CompileString(storyStr);

    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(2);
    expect(story.currentChoices[0].text).toBe('one');
    expect(story.currentChoices[1].text).toBe('four');

    story.ChooseChoiceIndex(0);
    story.ContinueMaximally();

    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe('two');

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`two\nthree\nsix\n`);
  });

  it('Tests weave options.', () => {
    const storyStr =
      ```
      -> test
      === test
        * Hello[.], world.
        -> END
      ```;

    const story = CompileString(storyStr);

    story.Continue();

    expect(story.currentChoices[0].text).toBe(`Hello.`);

    story.ChooseChoiceIndex(0);

    expect(story.Continue()).toBe(`Hello, world.\n`);
  });

  it('Tests whitespace.', () => {
    const storyStr =
      ```
      -> firstKnot
      === firstKnot
      Hello!
      -> anotherKnot

      === anotherKnot
      World.
      -> END
      ```;

    const story = CompileString(storyStr);
    const expected = `Hello!\nWorld.\n`;
 
    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests visit counts when choosing.', () => {
    const storyStr =
      ```
      == TestKnot ==
      this is a test
      + [Next] -> TestKnot2

      == TestKnot2 ==
      this is the end
      -> END
      ```;

    const story = CompileString(storyStr, true);

    expect(story.state.VisitCountAtPathString('TestKnot')).toBe(0);
    expect(story.state.VisitCountAtPathString('TestKnot2')).toBe(0);

    story.ChoosePathString('TestKnot');

    expect(story.state.VisitCountAtPathString('TestKnot')).toBe(1);
    expect(story.state.VisitCountAtPathString('TestKnot2')).toBe(0);

    story.Continue();

    expect(story.state.VisitCountAtPathString('TestKnot')).toBe(1);
    expect(story.state.VisitCountAtPathString('TestKnot2')).toBe(0);

    story.ChooseChoiceIndex(0);

    expect(story.state.VisitCountAtPathString('TestKnot')).toBe(1);

    // At this point, we have made the choice, but the divert *within* the choice
    // won't yet have been evaluated.
    expect(story.state.VisitCountAtPathString('TestKnot2')).toBe(0);

    story.Continue();

    expect(story.state.VisitCountAtPathString('TestKnot')).toBe(1);
    expect(story.state.VisitCountAtPathString('TestKnot2')).toBe(1);
  });

  // https://github.com/inkle/ink/issues/539
  it('Tests visit count bug due to nested containers.', () => {
    const storyStr = 
      ```
      - (gather) {gather}
      * choice
      - {gather}
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe(`1\n`);

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`choice\n1\n`);
  });

  it('Tests temp/global conflicts.', () => {
    // Test bug where temp was being treated as a global
    const storyStr =
      ```
      -> outer
      === outer
      ~ temp x = 0
      ~ f(x)
      {x}
      -> DONE

      === function f(ref x)
      ~temp local = 0
      ~x=x
      {setTo3(local)}

      === function setTo3(ref x)
      ~x = 3
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('0\n');
  });

  it('Tests threads in logic.', () => {
    const storyStr =
      ```
      -> once ->
      -> once ->

      == once ==
      {<- content|}
      ->->

      == content ==
      Content
      -> DONE
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe('Content\n');
  });

  it('Tests temp usage in options.', () => {
    const storyStr =
      ```
      ~ temp one = 1
      * \ {one}
      - End of choice 
      -> another
      * (another) this [is] another
      -> DONE
      ```;

    const story = CompileString(storyStr);
    story.Continue();

    expect(story.currentChoices.length).toBe(1);
    expect(story.currentChoices[0].text).toBe('1');

    story.ChooseChoiceIndex(0);

    expect(story.ContinueMaximally()).toBe(`1\nEnd of choice\nthis another\n`);
    expect(story.currentChoices.length).toBe(0);
  });


  [Test ()]
  it('Tests evaluating ink functions from game.', () => {
    const storyStr =
      ```
      Top level content
      * choice

      == somewhere ==
      = here
      -> DONE

      == function test ==
      ~ return -> somewhere.here
      ```;

    const story = CompileString(storyStr);

    story.Continue();

    const returnedDivertTarget = story.EvaluateFunction('test');

    // Divert target should get returned as a string
    expect(returnedDivertTarget).toBe(`somewhere.here`);
  });

  it('Also tests evaluating ink functions from game.', () => {
    const storyStr =
      ```
      One
      Two
      Three

      == function func1 ==
      This is a function
      ~ return 5

      == function func2 ==
      This is a function without a return value
      ~ return

      == function add(x,y) ==
      x = {x}, y = {y}
      ~ return x + y
      ```;

    const story = CompileString(storyStr);

    let {
      result,
      textOutput,
    } = story.EvaluateFunction('func1');

    expect(textOutput).toBe(`This is a function\n`);
    expect(result).toBe(5);
    expect(story.Continue()).toBe(`One\n`);

    let evalled = story.EvaluateFunction('func2');

    expect(evalled.textOutput).toBe(`This is a function without a return value\n`);
    expect(evalled.result).toBeNull();
    expect(story.Continue()).toBe(`Two\n`);

    evalled = story.EvaluateFunction('add', 1, 2);

    expect(evalled.textOutput).toBe(`x = 1, y = 2\n`);
    expect(evalled.result).toBe(3);
    expect(story.Continue()).toBe(`Three\n`);
  });

  it('Tests evaluating function variable state bug.', () => {
    const storyStr =
      ```
      Start
      -> tunnel ->
      End
      -> END

      == tunnel ==
      In tunnel.
      ->->

      === function function_to_evaluate() ===
      { zero_equals_(1):
          ~ return ""WRONG""
      - else:
          ~ return ""RIGHT""
      }

      === function zero_equals_(k) ===
      ~ do_nothing(0)
      ~ return  (0 == k)

      === function do_nothing(k)
      ~ return 0
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe(`Start\n`);
    expect(story.Continue()).toBe(`In tunnel.\n`);

    const { result } = story.EvaluateFunction('function_to_evaluate');

    expect(result).toBe('RIGHT');
    expect(story.Continue()).toBe('End\n');
  });

  it('Tests done, stopping thread mid-execution.', () => {
    const storyStr =
      ```
      -> DONE
      This content is inaccessible.
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe('');
  });

  it('Tests wrong variable divert target references.', () => {
    const storyStr =
      ```
      -> go_to_broken(-> SOMEWHERE)

      == go_to_broken(-> b)
      -> go_to(-> b) // INSTEAD OF: -> go_to(b)

      == go_to(-> a)
      -> a

      == SOMEWHERE ==
      Should be able to get here!
      -> DONE
      ```;

    CompileStringWithoutRuntime(storyStr);

    Assert.IsTrue (HadError ("it shouldn't be preceded by '->'"));
  });

  it('Tests left-right glue matching.', () => {
    const storyStr =
      ```
      A line.
      { f():
        Another line.
      }

      == function f ==
      {false:nothing}
      ~ return true
      ```;

    const story = CompileString(storyStr);
    const expected = `A line.\nAnother line.\n`;

    expect(story.ContinueMaximally()).toBe(expected);
  });

  it('Tests setting non-existent variables.', () => {
    var storyStr =
      ```
      VAR x = ""world""
      Hello {x}.
      ```;

    const story = CompileString(storyStr);

    expect(story.Continue()).toBe(`Hello world.\n`);

    const func = () => {
      story.variablesState.$('y', 'earth');
    };

    expect(func).toThrow();
  });

  it('Tests redefinition of constant variables.', () => {
    const storyStr =
      ```
      CONST pi = 3.1415
      CONST pi = 3.1415

      CONST x = ""Hello""
      CONST x = ""World""

      CONST y = 3
      CONST y = 3.0

      CONST z = -> somewhere
      CONST z = -> elsewhere

      == somewhere ==
      -> DONE

      == elsewhere ==
      -> DONE
      ```;

    CompileStringWithoutRuntime(storyStr);

    expect(HadError(`'pi' has been redefined`)).toBeFalsy();
    expect(HadError(`'x' has been redefined`)).toBe(true);
    expect(HadError(`'y' has been redefined`)).toBe(true);
    expect(HadError(`'z' has been redefined`)).toBe(true);
  });

  it('Tests tags.', () => {
    const storyStr =
      ```
      VAR x = 2 
      # author: Joe
      # title: My Great Story
      This is the content

      == knot ==
      # knot tag
      Knot content
      # end of knot tag
      -> END

      = stitch
      # stitch tag
      Stitch content
      # this tag is below some content so isn't included in the static tags for the stitch
      -> END
      ```;

    const story = CompileString(storyStr);

    const globalTags = [];
    globalTags.push(`author: Joe`);
    globalTags.push(`title: My Great Story`);

    const knotTags = [];
    knotTags.push(`knot tag`);

    const knotTagWhenContinuedTwice = [];
    knotTagWhenContinuedTwice.push(`end of knot tag`);

    const stitchTags = [];
    stitchTags.push(`stitch tag`);

    expect(story.globalTags).toEqual(globalTags);
    expect(story.Continue()).toBe(`This is the content\n`);
    expect(globalTags).toEqual(story.currentTags);
    expect(story.TagsForContentAtPath('knot')).toEqual(knotTags);
    expect(story.TagsForContentAtPath('knot.stitch')).toEqual(stitchTags);

    story.ChoosePathString('knot');

    expect(story.Continue()).toBe(`Knot content\n`);
    expect(story.currentTags).toEqual(knotTags);
    expect(story.Continue()).toBe('');
    expect(story.currentTags).toEqual(knotTagWhenContinuedTwice);
  });

  it('Tests tunnel onwards divert overrides.', () => {
    const storyStr =
      ```
      -> A ->
      We will never return to here!

      == A ==
      This is A
      ->-> B

      == B ==
      Now in B.
      -> END
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`This is A\nNow in B.\n`);
  });

  it('Tests basic list operations.', () => {
    const storyStr =
      ```
      LIST list = a, (b), c, (d), e
      {list}
      {(a, c) + (b, e)}
      {(a, b, c) ^ (c, b, e)}
      {list ? (b, d, e)}
      {list ? (d, b)}
      {list !? (c)}
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`b, d\na, b, c, e\nb, c\n0\n1\n1\n`);
  });

  it('Tests mixed list items.', () => {
    const storyStr =
      ```
      LIST list = (a), b, (c), d, e
      LIST list2 = x, (y), z
      {list + list2}
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`a, y, c\n`);
  });


  it('Also test list operations.', () => {
    const storyStr =
      ```
      LIST list = l, m = 5, n
      {LIST_VALUE(l)}

      {list(1)}

      ~ temp t = list()
      ~ t += n
      {t}
      ~ t = LIST_ALL(t)
      ~ t -= n
      {t}
      ~ t = LIST_INVERT(t)
      {t}
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`1\nl\nn\nl, m\nn\n`);
  });

  it('Tests the empty list origin.', () => {
    const storyStr =
      ```
      LIST list = a, b
      {LIST_ALL(list)}
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`a, b\n`);
  });

  it('Tests the empty list origin after assignment.', () => {
    const storyStr =
      ```
      LIST x = a, b, c
      ~ x = ()
      {LIST_ALL(x)}
      ```;

    const story = CompileString(storyStr);

    expect(story.ContinueMaximally()).toBe(`a, b, c\n`);
  });

  it('Tests saving and loading of lists.', () => { 
    const storyStr =
      ```
      LIST l1 = (a), b, (c)
      LIST l2 = (x), y, z

      VAR t = ()
      ~ t = l1 + l2
      {t}

      == elsewhere ==
      ~ t += z
      {t}
      -> END
      ```;

    const story = CompileString (storyStr);

    expect(story.ContinueMaximally()).toBe(`a, x, c\n`);

    const savedState = story.state.ToJson();

    // Compile new version of the story
    story = CompileString(storyStr);

    // Load saved game
    story.state.LoadJson(savedState);
    story.ChoosePathString('elsewhere');
    
    expect(story.ContinueMaximally()).toBe(`a, x, c, z\n`);
  });

  it('Tests empty thread errors.', () => {
    CompileStringWithoutRuntime('<-');
    expect(HadError('Expected target for new thread')).toBe(true);
  });

    [Test ()]
    public void TestAuthorWarningsInsideContentListBug ()
    {
        var storyStr =
            @"
{ once:
- a
TODO: b
}
";
        CompileString (storyStr, testingErrors:true);
        Assert.IsFalse (HadError ());
    }

    [Test ()]
    public void TestWeaveWithinSequence ()
    {
        var storyStr =
            @"
{ shuffle:
-   * choice
nextline
-> END
}
";
        var story = CompileString (storyStr);

        story.Continue ();

        Assert.IsTrue (story.currentChoices.Count == 1);

        story.ChooseChoiceIndex (0);

        Assert.AreEqual ("choice\nnextline\n", story.ContinueMaximally ());
    }


    [Test()]
    public void TestNestedChoiceError()
    {
        var storyStr =
            @"
{ true:
* choice
}
";
        CompileString(storyStr, testingErrors:true);
        Assert.IsTrue(HadError("need to explicitly divert"));
    }


    [Test ()]
    public void TestStitchNamingCollision ()
    {
        var storyStr =
            @"
VAR stitch = 0

== knot ==
= stitch
->DONE
";
        CompileString (storyStr, countAllVisits: false, testingErrors: true);

        Assert.IsTrue (HadError ("already been used for a var"));
    }


    [Test ()]
    public void TestWeavePointNamingCollision ()
    {
        var storyStr =
            @"
-(opts)
opts1
-(opts)
opts1
-> END
";
        CompileString (storyStr, countAllVisits: false, testingErrors:true);

        Assert.IsTrue(HadError ("with the same label"));
    }

    [Test ()]
    public void TestVariableNamingCollisionWithFlow ()
    {
        var storyStr =
            @"
LIST someList = A, B

~temp heldItems = (A) 
{LIST_COUNT (heldItems)}

=== function heldItems ()
~ return (A)
    ";
        CompileString (storyStr, countAllVisits: false, testingErrors: true);

        Assert.IsTrue (HadError ("name has already been used for a function"));
    }

    [Test ()]
    public void TestVariableNamingCollisionWithArg ()
    {
        var storyStr =
            @"=== function knot (a)
                ~temp a = 1";
        
        CompileString (storyStr, countAllVisits: false, testingErrors: true);

        Assert.IsTrue (HadError ("has already been used"));
    }

    [Test ()]
    public void TestTunnelOnwardsDivertAfterWithArg ()
    {
        var storyStr =
@"
-> a ->  

=== a === 
->-> b (5 + 3)

=== b (x) ===
{x} 
-> END
";

        var story = CompileString (storyStr);

        Assert.AreEqual ("8\n", story.ContinueMaximally ());
    }

    [Test ()]
    public void TestVariousDefaultChoices ()
    {
        var storyStr =
@"
* -> hello
Unreachable
- (hello) 1
* ->
- - 2
- 3
-> END
";

        var story = CompileString (storyStr);
        Assert.AreEqual ("1\n2\n3\n", story.ContinueMaximally ());
    }


    [Test ()]
    public void TestVariousBlankChoiceWarning ()
    {
      var storyStr =
    @"
* [] blank
    ";

      CompileString (storyStr, testingErrors:true);
        Assert.IsTrue (HadWarning ("Blank choice"));
    }

    [Test ()]
    public void TestTunnelOnwardsWithParamDefaultChoice ()
    {
        var storyStr =
@"
-> tunnel ->

== tunnel ==
* ->-> elsewhere (8)

== elsewhere (x) ==
{x}
-> END
";

        var story = CompileString (storyStr);
        Assert.AreEqual ("8\n", story.ContinueMaximally ());
    }


    [Test ()]
    public void TestReadCountVariableTarget ()
    {
        var storyStr =
@"
VAR x = ->knot

Count start: {READ_COUNT (x)} {READ_COUNT (-> knot)} {knot}

-> x (1) ->
-> x (2) ->
-> x (3) ->

Count end: {READ_COUNT (x)} {READ_COUNT (-> knot)} {knot}
-> END


== knot (a) ==
{a}
->->
";

        var story = CompileString (storyStr, countAllVisits:true);
        Assert.AreEqual ("Count start: 0 0 0\n1\n2\n3\nCount end: 3 3 3\n", story.ContinueMaximally ());
    }


    [Test ()]
    public void TestDivertTargetsWithParameters ()
    {
        var storyStr =
@"
VAR x = ->place

->x (5)

== place (a) ==
{a}
-> DONE
";

        var story = CompileString (storyStr);

        Assert.AreEqual ("5\n", story.ContinueMaximally ());
    }

    [Test ()]
    public void TestTagOnChoice ()
    {
        var storyStr =
@"
* [Hi] Hello -> END #hey
";

        var story = CompileString (storyStr);

        story.Continue ();

        story.ChooseChoiceIndex (0);

        var txt = story.Continue ();
        var tags = story.currentTags;

        Assert.AreEqual ("Hello", txt);
        Assert.AreEqual (1, tags.Count);
        Assert.AreEqual ("hey", tags[0]);
    }

    [Test ()]
    public void TestStringContains ()
    {
      var storyStr =
@"
{""hello world"" ? ""o wo""}
{""hello world"" ? ""something else""}
{""hello"" ? """"}
{"""" ? """"}
";

      var story = CompileString (storyStr);

      var result = story.ContinueMaximally ();

      Assert.AreEqual ("1\n0\n1\n1\n", result);
    }

    [Test ()]
    public void TestEvaluationStackLeaks ()
    {
      var storyStr =
@"
{false:

- else: 
else
}

{6:
- 5: five
- else: else
}

-> onceTest ->
-> onceTest ->

== onceTest ==
{once:
- hi
}
->->
";

      var story = CompileString (storyStr);

      var result = story.ContinueMaximally ();

      Assert.AreEqual ("else\nelse\nhi\n", result);
        Assert.IsTrue (story.state.evaluationStack.Count == 0);
    }

    [Test ()]
    public void TestGameInkBackAndForth ()
    {
      var storyStr =
        @"
EXTERNAL gameInc(x)

== function topExternal(x)
In top external
~ return gameInc(x)

== function inkInc(x)
~ return x + 1

        ";

      var story = CompileString (storyStr);

        // Crazy game/ink callstack:
        // - Game calls "topExternal(5)" (Game -> ink)
        // - topExternal calls gameInc(5) (ink -> Game)
        // - gameInk increments to 6
        // - gameInk calls inkInc(6) (Game -> ink)
        // - inkInc just increments to 7 (ink)
        // And the whole thing unwinds again back to game.

        story.BindExternalFunction("gameInc", (int x) => {
            x++;
            x = (int) story.EvaluateFunction ("inkInc", x);
            return x;
        });

        string strResult;
        var finalResult = (int) story.EvaluateFunction ("topExternal", out strResult, 5);

        Assert.AreEqual (7, finalResult);
        Assert.AreEqual ("In top external\n", strResult);
    }


    [Test ()]
    public void TestNewlinesWithStringEval ()
    {
      var storyStr =
@"
A
~temp someTemp = string()
B

A 
{string()}
B

=== function string()    
~ return ""{3}""
}
";

      var story = CompileString (storyStr);

      Assert.AreEqual ("A\nB\nA\n3\nB\n", story.ContinueMaximally ());
    }


    [Test ()]
    public void TestNewlinesTrimmingWithFuncExternalFallback ()
    {
      var storyStr =
@"
EXTERNAL TRUE ()

Phrase 1 
{ TRUE ():

Phrase 2
}
-> END 

=== function TRUE ()
~ return true
";

      var story = CompileString (storyStr);
        story.allowExternalFunctionFallbacks = true;

      Assert.AreEqual ("Phrase 1\nPhrase 2\n", story.ContinueMaximally ());
    }

    [Test ()]
    public void TestMultilineLogicWithGlue ()
    {
      var storyStr =
@"
{true:
a 
} <> b


{true:
a 
} <> { true: 
b 
}
";
      var story = CompileString (storyStr);

      Assert.AreEqual ("a b\na b\n", story.ContinueMaximally ());
    }



    [Test ()]
    public void TestNewlineAtStartOfMultilineConditional ()
    {
      var storyStr =
    @"
{isTrue():
x
}

=== function isTrue()
X
~ return true
    ";
      var story = CompileString (storyStr);

      Assert.AreEqual ("X\nx\n", story.ContinueMaximally ());
    }

    [Test ()]
    public void TestTempNotFound ()
    {
      var storyStr =
    @"
{x}
~temp x = 5
hello
            ";
      var story = CompileString (storyStr);

      Assert.AreEqual ("0\nhello\n", story.ContinueMaximally ());

      Assert.IsTrue (story.hasWarning);
    }


    [Test ()]
    public void TestTempNotAllowedCrossStitch ()
    {
      var storyStr =
            @"
-> knot.stitch

== knot (y) ==
~temp x = 5
-> END

= stitch
{x} {y}
-> END
  ";
        
      CompileStringWithoutRuntime (storyStr, testingErrors:true);

        Assert.IsTrue (HadError ("Unresolved variable: x"));
        Assert.IsTrue (HadError ("Unresolved variable: y"));
    }



    [Test ()]
    public void TestTopFlowTerminatorShouldntKillThreadChoices ()
    {
      var storyStr =
        @"
<- move
Limes 

=== move
* boop
    -> END
                ";

        var story = CompileString (storyStr);

        Assert.AreEqual ("Limes\n", story.Continue ());
        Assert.IsTrue (story.currentChoices.Count == 1);
    }


    [Test ()]
    public void TestNewlineConsistency ()
    {
      var storyStr =
        @"
hello -> world
== world
world 
-> END";

      var story = CompileString (storyStr);
      Assert.AreEqual ("hello world\n", story.ContinueMaximally ());

        storyStr =
@"
* hello -> world
== world
world 
-> END";
        story = CompileString (storyStr);

        story.Continue ();
        story.ChooseChoiceIndex (0);
        Assert.AreEqual ("hello world\n", story.ContinueMaximally ());


        storyStr =
@"
* hello 
-> world
== world
world 
-> END";
        story = CompileString (storyStr);

        story.Continue ();
        story.ChooseChoiceIndex (0);
        Assert.AreEqual ("hello\nworld\n", story.ContinueMaximally ());
    }


    [Test ()]
    public void TestListRandom ()
    {
        var storyStr =
            @"
LIST l = A, (B), (C), (D), E
{LIST_RANDOM(l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
{LIST_RANDOM (l)}
                ";

        var story = CompileString (storyStr);

        while (story.canContinue) {
            var result = story.Continue ();
            Assert.IsTrue (result == "B\n" || result == "C\n" || result == "D\n");
        }
    }


    [Test ()]
    public void TestTurns ()
    {
        var storyStr =
            @"
-> c
- (top)
+ (c) [choice]
{TURNS ()}
-> top
                ";

        var story = CompileString (storyStr);

        for (int i = 0; i < 10; i++) {
            Assert.AreEqual(i + "\n", story.Continue ());
            story.ChooseChoiceIndex (0);
        }
    }




    [Test ()]
    public void TestLogicLinesWithNewlines ()
    {
        // Both "~" lines should be followed by newlines
        // since func() has a text output side effect.
        var storyStr =
    @"
~ func ()
text 2

~temp tempVar = func ()
text 2

== function func ()
text1
~ return true
";

        var story = CompileString (storyStr);

        Assert.AreEqual("text1\ntext 2\ntext1\ntext 2\n", story.ContinueMaximally ());
    }

    [Test()]
    public void TestFloorCeilingAndCasts()
    {
        var storyStr =
    @"
{FLOOR(1.2)}
{INT(1.2)}
{CEILING(1.2)}
{CEILING(1.2) / 3}
{INT(CEILING(1.2)) / 3}
{FLOOR(1)}
";

        var story = CompileString(storyStr);

        Assert.AreEqual("1\n1\n2\n0.6666667\n0\n1\n", story.ContinueMaximally());
    }

    [Test()]
    public void TestListRange()
    {
        var storyStr =
    @"
LIST Food = Pizza, Pasta, Curry, Paella
LIST Currency = Pound, Euro, Dollar
LIST Numbers = One, Two, Three, Four, Five, Six, Seven

VAR all = ()
~ all = LIST_ALL(Food) + LIST_ALL(Currency)
{all}
{LIST_RANGE(all, 2, 3)}
{LIST_RANGE(LIST_ALL(Numbers), Two, Six)}
{LIST_RANGE((Pizza, Pasta), -1, 100)} // allow out of range
";

        var story = CompileString(storyStr);

        Assert.AreEqual(
@"Pound, Pizza, Euro, Pasta, Dollar, Curry, Paella
Euro, Pasta, Dollar, Curry
Two, Three, Four, Five, Six
Pizza, Pasta
", story.ContinueMaximally());
    }
        
    // Fix for rogue "can't use as sub-expression" bug
    [Test()]
    public void TestUsingFunctionAndIncrementTogether()
    {
        var storyStr =
    @"
VAR x = 5
~ x += one()

=== function one()
~ return 1
";
          
        // Ensure it just compiles
        CompileStringWithoutRuntime(storyStr);
    }

    // Fix for rogue "can't use as sub-expression" bug
    [Test()]
    public void TestKnotStitchGatherCounts()
    {
        var storyStr =
    @"
VAR knotCount = 0
VAR stitchCount = 0

-> gather_count_test ->

~ knotCount = 0
-> knot_count_test ->

~ knotCount = 0
-> knot_count_test ->

-> stitch_count_test ->

== gather_count_test ==
VAR gatherCount = 0
- (loop)
~ gatherCount++
{gatherCount} {loop}
{gatherCount<3:->loop}
->->

== knot_count_test ==
~ knotCount++
{knotCount} {knot_count_test}
{knotCount<3:->knot_count_test}
->->


== stitch_count_test ==
~ stitchCount = 0
-> stitch ->
~ stitchCount = 0
-> stitch ->
->->

= stitch
~ stitchCount++
{stitchCount} {stitch}
{stitchCount<3:->stitch}
->->
";

        // Ensure it just compiles
        var story = CompileString(storyStr);

        Assert.AreEqual(
@"1 1
2 2
3 3
1 1
2 1
3 1
1 2
2 2
3 2
1 1
2 1
3 1
1 2
2 2
3 2
", story.ContinueMaximally());
    }

    // Fix for threads being incorrectly reused between choices
    // and the main thread after save/reload
    // https://github.com/inkle/ink/issues/463
    [Test()]
    public void TestChoiceThreadForking()
    {
        var storyStr =
    @"
-> generate_choice(1) ->

== generate_choice(x) ==
{true:
+ A choice
    Vaue of local var is: {x}
    -> END
}
->->
";

        // Generate the choice with the forked thread
        var story = CompileString(storyStr);
        story.Continue();

        // Save/reload
        var savedState = story.state.ToJson();
        story = CompileString(storyStr);
        story.state.LoadJson(savedState);

        // Load the choice, it should have its own thread still
        // that still has the captured temp x
        story.ChooseChoiceIndex(0);
        story.ContinueMaximally();

        // Don't want this warning:
        // RUNTIME WARNING: '' line 7: Variable not found: 'x'
        Assert.IsFalse(story.hasWarning);
    }


    [Test()]
    public void TestFallbackChoiceOnThread()
    {
        var storyStr =
    @"
<- knot

== knot
~ temp x = 1
*   ->
    Should be 1 not 0: {x}.
    -> DONE
";

        var story = CompileString(storyStr);
        Assert.AreEqual("Should be 1 not 0: 1.\n", story.Continue());
    }

    // Test for bug where after a call to ChoosePathString,
    // the callstack is not fully/cleanly reset, e.g. leaving
    // "inExpressionEvaluation" variable left to true, as set during
    // the call to {RunAThing()}.
    // This was when we unwound the callstack, but we didn't reset
    // the base element.
    [Test()]
    public void TestCleanCallstackResetOnPathChoice()
    {
        var storyStr =
    @"
{RunAThing()}

== function RunAThing ==
The first line.
The second line.

== SomewhereElse ==
{""somewhere else""}
->END
";

        var story = CompileString(storyStr);

        Assert.AreEqual("The first line.\n", story.Continue());

        story.ChoosePathString("SomewhereElse");

        Assert.AreEqual("somewhere else\n", story.ContinueMaximally());
    }


    // Test for bug where choice's owned thread would get 
    // reused between re-runs after a state reset, and in
    // this case would be in the middle of expression evaluation
    // at the time, causing an error.
    // Fixed by re-forking the choice thread
    // in TryFollowDefaultInvisibleChoice
    [Test()]
    public void TestStateRollbackOverDefaultChoice()
    {
        var storyStr =
    @"
<- make_default_choice
Text.

=== make_default_choice
*   -> 
    {5}
    -> END 
";

        var story = CompileString(storyStr);

        Assert.AreEqual("Text.\n", story.Continue());
        Assert.AreEqual("5\n", story.Continue());
    }

    [Test()]
    public void TestCharacterRangeIdentifiersForConstNamesWithAsciiPrefix()
    {
        var ranges = InkParser.ListAllCharacterRanges();
        for (int i = 0; i < ranges.Length; i++)
        {

            var range = ranges[i];

            var identifier = GenerateIdentifierFromCharacterRange(range);

            var storyStr = string.Format(@"
CONST pi{0} = 3.1415
CONST a{0} = ""World""
CONST b{0} = 3
", identifier);

            var compiledStory = CompileStringWithoutRuntime(storyStr, testingErrors: false);

            Assert.IsNotNull(compiledStory);
            Assert.IsFalse(compiledStory.hadError);
        }
    }
    [Test()]
    public void TestCharacterRangeIdentifiersForConstNamesWithAsciiSuffix()
    {
        var ranges = InkParser.ListAllCharacterRanges();
        for (int i = 0; i < ranges.Length; i++)
        {

            var range = ranges[i];

            var identifier = GenerateIdentifierFromCharacterRange(range);

            var storyStr = string.Format(@"
CONST {0}pi = 3.1415
CONST {0}a = ""World""
CONST {0}b = 3
", identifier);

            var compiledStory = CompileStringWithoutRuntime(storyStr, testingErrors: false);

            Assert.IsNotNull(compiledStory);
            Assert.IsFalse(compiledStory.hadError);
        }
    }

    [Test()]
    public void TestCharacterRangeIdentifiersForSimpleVariableNamesWithAsciiPrefix()
    {
        var ranges = InkParser.ListAllCharacterRanges();
        for (int i = 0; i < ranges.Length; i++)
        {

            var range = ranges[i];

            var identifier = GenerateIdentifierFromCharacterRange(range);

            var storyStr = string.Format(@"
VAR pi{0} = 3.1415
VAR a{0} = ""World""
VAR b{0} = 3
", identifier);

            var compiledStory = CompileStringWithoutRuntime(storyStr, testingErrors: false);

            Assert.IsNotNull(compiledStory);
            Assert.IsFalse(compiledStory.hadError);
        }
    }

    [Test()]
    public void TestCharacterRangeIdentifiersForSimpleVariableNamesWithAsciiSuffix()
    {
        var ranges = InkParser.ListAllCharacterRanges();
        for (int i = 0; i < ranges.Length; i++)
        {

            var range = ranges[i];

            var identifier = GenerateIdentifierFromCharacterRange(range);

            var storyStr = string.Format(@"
VAR {0}pi = 3.1415
VAR {0}a = ""World""
VAR {0}b = 3
", identifier);

            var compiledStory = CompileStringWithoutRuntime(storyStr, testingErrors: false);

            Assert.IsNotNull(compiledStory);
            Assert.IsFalse(compiledStory.hadError);
        }
    }


    [Test ()]
    public void TestCharacterRangeIdentifiersForDivertNamesWithAsciiPrefix()
    {
        var ranges = InkParser.ListAllCharacterRanges();
        for (int i = 0; i < ranges.Length; i++) {

            var range = ranges[i];
            var rangeString = GenerateIdentifierFromCharacterRange(range);


            var storyStr = string.Format(@"
VAR z{0} = -> divert{0}

== divert{0} ==
-> END
", rangeString);
            
            var compiledStory = CompileStringWithoutRuntime (storyStr, testingErrors:false);

            Assert.IsNotNull (compiledStory);
            Assert.IsFalse (compiledStory.hadError);
        }
    }
    [Test()]
    public void TestCharacterRangeIdentifiersForDivertNamesWithAsciiSuffix()
    {
        var ranges = InkParser.ListAllCharacterRanges();
        for (int i = 0; i < ranges.Length; i++)
        {

            var range = ranges[i];
            var rangeString = GenerateIdentifierFromCharacterRange(range);


            var storyStr = string.Format(@"
VAR {0}z = -> {0}divert

== {0}divert ==
-> END
", rangeString);

            var compiledStory = CompileStringWithoutRuntime(storyStr, testingErrors: false);

            Assert.IsNotNull(compiledStory);
            Assert.IsFalse(compiledStory.hadError);
        }
    }
}
