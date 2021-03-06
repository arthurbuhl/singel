#!/usr/bin/env node
import { resolve, relative, isAbsolute } from "path";
import meow from "meow";
import glob from "glob";
import ReactTester from "./ReactTester";
import Logger from "./Logger";
import babelConfig from "./babelConfig";

const cli = meow(
  `
  Usage
    $ singel <path>

  Options
    --ignore, -i Ignore paths

  Examples
    $ singel src/elements/**/*.js
`,
  {
    flags: {
      ignore: {
        type: "string",
        alias: "i"
      }
    }
  }
);

const run = (paths, { ignore }) => {
  Logger.lineBreak();

  require("babel-register")(babelConfig);

  const realPaths = paths.reduce(
    (acc, path) => [...acc, ...glob.sync(path, { ignore, nodir: true })],
    []
  );

  let hasErrors = false;
  let lastHasError = false;

  const exit = () => {
    if (hasErrors) {
      process.exit(1);
    }
  };

  realPaths.forEach((path, i) => {
    const absolutePath = isAbsolute(path) ? path : resolve(process.cwd(), path);
    const relativePath = relative(process.cwd(), absolutePath);
    const { default: Element } = require(absolutePath);
    const tester = new ReactTester(Element);
    const logger = new Logger(Element, relativePath);

    logger.start();

    tester.on("error", message => {
      hasErrors = true;
      logger.addError(message);
    });

    tester.on("end", failed => {
      if (failed) {
        logger.fail(i > 0 && !lastHasError);
        lastHasError = true;
      } else {
        logger.succeed();
        lastHasError = false;
      }
    });

    tester.run();
  });

  exit();
};

run(cli.input, cli.flags);
