# Developer

## Participating

You can post an issue or you can open a PR, if there is a functionality that you think will be relevant to the project.

Your code will be posted using the same license as this project.

## Running tests

> npm test

## Build

> npm run build

## Features

- [x] Emit onProgress events
- [x] Emit onDone events
- [x] Similar API as the original fetch API

## TODO

- Better events
  - Probably will need to emit an identifier and the url of the event
  - So using a single events bus will be possible

## Debugging tests

You can use browser.debug() to pause the opened window when running a test.

The launch.json configurations are taken from the official documentation of WebDriverIO, but they do not seem to be working.
