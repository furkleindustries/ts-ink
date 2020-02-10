import {
  Compiler,
  CompilerOptions,
  RuntimeStory,
  Stopwatch,
} from '../dist';

export class InkTestBed {
  story = null;
  compiler = null;

  _errors = [];
  _warnings = [];
  _authorMessages = [];

  // ---------------------------------------------------------------
  // Main area to test stuff!
  // ---------------------------------------------------------------

  Run = () => {
    this.Play();
  };

  // ---------------------------------------------------------------
  // Useful functions when testing
  // ---------------------------------------------------------------

  // Full play loop
  Play = () => {
    if (!this.story) {
      this.CompileFile('test.ink');
    }

    // Errors to the extent that story couldn't be constructed?
    if (!this.story) {
      return;
    }

    while (this.story.canContinue || this.story.currentChoices.length) {
      if (this.story.canContinue) {
        this.ContinueMaximally();
      }

      this.PrintAllMessages();

      if (this.story.currentChoices.length) {
        this.Choose(
          Math.floor(Math.random() * this.story.currentChoices.length),
        );
      }
    }
  }

  Continue = () => {
    console.log(this.story.Continue());
    this.PrintChoicesIfNecessary();
    this.PrintAllMessages(); // errors etc
  };

  ContinueMaximally = () => {
    console.log(this.story.ContinueMaximally());
    this.PrintChoicesIfNecessary();
    this.PrintAllMessages(); // errors etc
  };

  Choose = (choiceIdx) => {
    this.story.ChooseChoiceIndex(choiceIdx);
  };

  Compile = (inkSource) => {
    this.compiler = new Compiler(
      inkSource,
      new CompilerOptions({
        errorHandler: this.OnError,
        fileHandler: this,
      }),
    );

    this.story = this.compiler.Compile();

    this.PrintAllMessages();

    return this.story;
  };

  CompileFile = (_filename = null) => {
    let filename = _filename || 'test.ink';

    if (require('path').isAbsolute(filename)) {
      const dir = require('path').dirname(filename);
      // Directory.SetCurrentDirectory(dir);
    }

    const inkSource = require('fs').readFileSync(filename);

    this.compiler = new Compiler(
      inkSource,
      new CompilerOptions({
        sourceFilename: filename,
        errorHandler: OnError,
        fileHandler: this,
      }),
    );

    this.story = this.compiler.Compile();

    this.PrintAllMessages();

    return story;
  };

  JsonRoundtrip = () => {
    const jsonStr = this.story.ToJson();
    console.log(jsonStr);

    console.log('-'.repeat(52));

    const reloadedStory = new RuntimeStory(jsonStr);
    const newJsonStr = reloadedStory.ToJson();
    console.log(newJsonStr);

    this.story = reloadedStory;
  };

  // e.g.:
  //
  // Hello world
  // + choice
  //     done!
  //     -> END
  //
  // ------ SECOND INK VERSION ------
  //
  // Hello world
  // + choice
  //     done!
  //     -> END
  //
  SplitFile = (filename) => {
    const splitStr = '------ SECOND INK VERSION ------';

    const fullSource = require('fs').readFileSync(filename);

    const idx = fullSource.indexOf(splitStr);
    if (idx === -1) {
      throw new Error(`Split point not found in ${filename}.`);
    }

    const ink1 = fullSource.slice(0, idx);
    const ink2 = fullSource.slice(idx + splitStr.Length);

    return [ ink1, ink2 ];
  };

  // e.g.:
  //
  //     InkChangingTest (() => {
  //         ContinueMaximally ();
  //         story.ChooseChoiceIndex (0);
  //     }, () => {
  //         ContinueMaximally ();
  //     });
  //
  InkChangingTest = (test1, test2) => {
    const [ ink1, ink2 ] = this.SplitFile('test.ink');

    const story1 = this.Compile(ink1);

    test1();

    const saveState = story1.state.ToJson();

    console.log('------ SECOND INK VERSION ------');

    const story2 = this.Compile(ink2);

    story2.state.LoadJson(saveState);

    test2();
  };

  SimpleDiff = (s1, s2) => {
    if (s1 === s2) {
      console.log("Identical!");
    } else {
      let foundDiff = false;
      for (let ii = 0; ii < Math.min(s2.length, s1.length); ii += 1) {
        if (s2[ii] !== s1[ii]) {
          foundDiff = true;
          const diffI = Math.max(ii - 10, 0);
          Console.WriteLine(
            `Difference at idx ${ii}: \n\t${s1.slice(diffI, 40)}\nv.s.\n\t${s2.slice(diffI, 40)}`,
          );

          break;
        }
      }

      if (!foundDiff) {
        const startOfExtension = Math.min(s1.length, s2.length);
        const longerText = s1.length > s2.length ? s1 : s2;
        console.log(
          `Difference in length: ${s1.length} vs. ${s2.length}. Extended: ${longerText.slice(startOfExtension)}`,
        );
      }
    }
  };

  // Examples of usage:
  //
  //     var duration = Millisecs(() => DoSomething());
  //
  // Or to take the average after running DoSomething 100 times, but skipping
  // the first time (since we want to know the "warmed caches" time:
  //
  //     var duration = Millisecs((() => DoSomething(), 100, 1);
  //
  Millisecs = (action, times = 1, ignoreWarmupTimes = 0) => {
    const s = new Stopwatch();
    const realTimes = times - ignoreWarmupTimes;

    if (times === 1 && !ignoreWarmupTimes) {
      s.Start();

      action();

      s.Stop();
    } else {
      if (ignoreWarmupTimes > 0) {
        for (let ii = 0; ii < ignoreWarmupTimes; ii++) {
          action();
        }
      }
      
      s.Start();

      for (let ii = 0; ii < realTimes; ii++) {
        action();
      }

      s.Stop();
    }

    const ticks = s.ElapsedTicks;
    const ticksPerSec = Stopwatch.Frequency;
    const ticksPerMillisec = ticksPerSec / 1000;
    const millisecs = ticks / ticksPerMillisec;

    return millisecs / realTimes;
  };

  // ---------------------

  static Main = () => {
    new InkTestBed().Run();
    console.log('>>> TEST BED ENDED <<<');
  };

  PrintMessages = (messageList, colour) => {
    // Console.ForegroundColor = colour;

    for (msg of messageList) {
      console.log(msg);
    }

    // Console.ResetColor ();
  };

  PrintAllMessages = () => {
    this.PrintMessages(this._authorMessages);//, ConsoleColor.Green);
    this.PrintMessages(this._warnings);//, ConsoleColor.Blue);
    this.PrintMessages(this._errors);//, ConsoleColor.Red);

    this._authorMessages = [];
    this._warnings = [];
    this._errors = [];

    if (this.story) {
      if (this.story.hasError) {
        this.PrintMessages(story.currentErrors, ConsoleColor.Red);
      }

      if (this.story.hasWarning) {
        this.PrintMessages(story.currentWarnings, ConsoleColor.Blue);
      }

      this.story.ResetErrors();
    }
  };

  PrintChoicesIfNecessary = () => {
    if (!story.canContinue && story.currentChoices) {
      let number = 1;
      story.currentChoices.forEach(({ text }) => {
        console.log(` ${number}) ${text}`);
        number += 1;
      });
    }
  };

  OnError = (message, errorType) => {
    switch (errorType) {
      case ErrorType.Author:
        this._authorMessages.push(message);
        break;

      case ErrorType.Warning:
        this._warnings.push(message);
        break;

      case ErrorType.Error:
        this._errors.push(message);
        break;
    }
  };

  ResolveInkFilename = (includeName) => {
    const workingDir = process.cwd();
    const fullRootInkPath = require('path').resolve(workingDir, includeName);
    return fullRootInkPath;
  };

  LoadInkFileContents = (fullFilename) => {
    return require('fs').readFileSync(fullFilename);
  };
}
