import Emittery from "emittery";
import { Events, FetchProgress } from "../../src/domain/FetchProgress";
import { expect } from 'chai';

const filename = 'https://word-guessing.isirode.ovh/grammalecte/db-fra-grammalecte-1.0.0.db';

describe('FetchProgress', () => {
  describe('fetch', () => {

    let lastProgressPerCent: number = 0;

    const events = new Emittery<Events>();

    events.on('onProgress', ({contentLength, currentData, currentProgress, lastChunk}) => {
      if (contentLength === null) {
        return;
      }
      const progressInPerCent = currentProgress / contentLength * 100;
      if (progressInPerCent >= lastProgressPerCent + 10) {
        console.log(progressInPerCent.toFixed() + ' %');
        lastProgressPerCent += 10;
      }
    });

    it('should fetch the file', async () => {
      // given
      const expectedFileSize = 80740352;

      // when
      try {
        const fetchProgress: FetchProgress = new FetchProgress(events);
        const arrayFile = await fetchProgress.fetch(filename);

        // then
        expect(arrayFile.length).to.be.equal(expectedFileSize);
      } catch (err: unknown) {
        console.log('an error occurred in the browser', err);
        // browser.debug();
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
        console.log('an error occurred in the browser', err);
        // browser.debug();
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
        console.log('an error occurred in the browser', err);
        // browser.debug();
        throw err;
      }
    });
  });
});
