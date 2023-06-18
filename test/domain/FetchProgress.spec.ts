import Emittery from "emittery";
import { Events, FetchProgress } from "../../src/domain/FetchProgress";
import { expect } from 'chai';
import { browser, $, $$, expect as wdioExpect } from '@wdio/globals';
import { ConsoleAppender, IConfiguration, ILogger, Level, LogManager, LoggerFactory, PupaLayout } from "log4j2-typescript";

const filename = 'https://word-guessing.isirode.ovh/grammalecte/db-fra-grammalecte-1.0.0.db';

// Info : you will need to display the verbose logs in the browser's debugger if you want to see the FetchProgress's logs
// Since they are of debug level
const logConfiguration: IConfiguration = {
  appenders: [
    new ConsoleAppender("console", new PupaLayout("{loggerName} {level} {time} {message}"))
  ],
  loggers: [
    {
      name: "com.isirode.",
      level: Level.DEBUG,
      refs: [
        {
          ref: "console"
        },
      ]
    }
  ]
}

const logManager: LogManager = new LogManager(logConfiguration);

describe('FetchProgress', () => {
  describe('fetch', () => {

    const logger: ILogger = LoggerFactory.getLogger('com.isirode.fetch-progress.test');

    let lastProgressPerCent: number = 0;

    const events = new Emittery<Events>();

    events.on('onProgress', ({contentLength, currentData, currentProgress, lastChunk}) => {
      if (contentLength === null) {
        return;
      }
      const progressInPerCent = currentProgress / contentLength * 100;
      if (progressInPerCent >= lastProgressPerCent + 10) {
        logger.info(progressInPerCent.toFixed() + ' %');
        lastProgressPerCent += 10;
      }
    });

    it('should fetch the file', async () => {
      // given
      const expectedFileSize = 80740352;

      // await browser.debug();

      // when
      try {
        const fetchProgress: FetchProgress = new FetchProgress(events);
        const arrayFile = await fetchProgress.fetch(filename);

        // then
        expect(arrayFile.length).to.be.equal(expectedFileSize);
      } catch (err: unknown) {
        logger.error('an error occurred in the browser', {}, err as Error);
        // await browser.debug();
        throw err;
      }
    });

    it('should emit progress events', async () => {
      // given
      const events = new Emittery<Events>();
      let onProgressCallCount = 0;

      events.on('onProgress', ({contentLength, currentData, currentProgress, lastChunk}) => {
        onProgressCallCount += 1;
      });

      // when
      try {
        const fetchProgress: FetchProgress = new FetchProgress(events);
        const arrayFile = await fetchProgress.fetch(filename);

        // then
        expect(arrayFile.length).to.be.greaterThanOrEqual(1);
      } catch (err: unknown) {
        logger.error('an error occurred in the browser', {}, err as Error);
        // await browser.debug();
        throw err;
      }
    });

    it('should emit done events', async () => {
      // given
      const expectedFileSize = 80740352;
      const events = new Emittery<Events>();
      let onDoneCallCount = 0; 
      let onDoneData: Uint8Array | undefined = undefined;
      let onDoneDataLength = 0;

      events.on('onDone', ({data}) => {
        onDoneCallCount += 1;
        onDoneData = data;
        onDoneDataLength = data.length;
      });

      // when
      try {
        const fetchProgress: FetchProgress = new FetchProgress(events);
        const arrayFile = await fetchProgress.fetch(filename);

        // then
        expect(onDoneCallCount).to.be.equal(1);
        expect(onDoneData).to.not.be.equal(undefined);
        expect(onDoneDataLength).to.be.equal(expectedFileSize);
      } catch (err: unknown) {
        logger.error('an error occurred in the browser', {}, err as Error);
        // await browser.debug();
        throw err;
      }
    });
  });
});
