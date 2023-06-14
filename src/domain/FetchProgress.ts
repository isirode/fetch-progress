import Emittery from "emittery";

const contentLengthKey = 'content-length';

export interface OnProgressData {
  contentLength: number | null;
  currentProgress: number;
  lastChunk: Uint8Array;
  currentData: Uint8Array;
}

export interface OnDoneData {
  data: Uint8Array;
}

export interface Events {
  onProgress: OnProgressData;
  onDone: OnDoneData;
}

// TODO : cancellation
// on ctrl+c, escape
// see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal

// TODO : follow this
// there is an observe FetchObserver proposition in progress
// Mozilla seem to have abandonned it
// see https://github.com/whatwg/fetch/issues/607

// TODO : verify the content using a hash
// Maybe not in this class

export class FetchProgress {

  events?: Emittery<Events>;

  constructor(events?: Emittery<Events>) {
    this.events = events;
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Uint8Array> {
    console.log('fetch', input);
    let uint8Array: Uint8Array | null = null;
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (err: unknown) {
      // Info : throw {} when there is a CORS issue, or other kind of issue related to HTTP
      // The error will be in the browser but is not available here, or available to WebDriverIO
      console.log('an http error occurred');
      console.error('an error occurred', err);
      throw err;
    }
    if (response === null) {
      throw new Error('response is null');
    }
    if (response.body === null) {
      throw new Error('body of response is null');
    }
    
    console.log(`status: ${response.status} ${response.statusText}`);
    console.log('Headers : ' + JSON.stringify(response.headers));
    console.log(...response.headers);
    response.headers.forEach((value, key) => {
      console.log(key + ':' + value);
    });
    // Not all headers are log
    // It needs CORS authorization
    /*
    HTTP/1.1 200 OK
    Server: nginx/1.14.0 (Ubuntu)
    Date: Mon, 27 Feb 2023 20:49:28 GMT
    Last-Modified: Sun, 26 Feb 2023 21:47:11 GMT
    Access-Control-Allow-Origin: *
    Content-Type: application/octet-stream
    Content-Length: 80740352
    ETag: "63fbd35f-4d00000"
    Accept-Ranges: bytes
    */
   // TODO : handle zipping, the size would not be correct
   // It would require a custom header, or to know the size of the document beforehand
   // Content-Encoding: gzip

    const contentLength = response.headers.get(contentLengthKey);
    if (contentLength != null) {
      const contentLengthInt = parseInt(contentLength, 10);
      uint8Array = await this.getResponseContentWithKnownContentLength(response, contentLengthInt);
    } else {
      uint8Array = await this.getResponseContentWithUnknownContentLength(response);
    }

    // TODO : fix this, should not be null
    if (uint8Array === null) {
      throw new Error("array is null at the end of the fetch");
    }

    this.events?.emit('onDone', {
      data: uint8Array
    });

    return uint8Array;
  }

  async getResponseContentWithKnownContentLength(response: Response, contentLength: number): Promise<Uint8Array | null> {
    if (response.body === null) {
      throw new Error('body of response is null');
    }

    let uint8Array: Uint8Array = new Uint8Array(contentLength);
    let progress = 0;

    const me = this;

    await response.body.pipeTo(new WritableStream({
      write(chunk) {
        // console.log("new chunk");

        uint8Array.set(chunk, progress);
        progress += chunk.length;

        me.events?.emit('onProgress', {
          contentLength: contentLength,
          currentProgress: progress,
          lastChunk: chunk,
          currentData: uint8Array
        });
        
        // console.log("progress: " + progress);
      },
      close() {
        console.log("close");
      },
      abort(e) {
        console.error("abort", e);
      }
    }));

    return uint8Array;
  }

  async getResponseContentWithUnknownContentLength(response: Response): Promise<Uint8Array | null> {

    if (response.body === null) {
      throw new Error('body of response is null');
    }

    let uint8Array: Uint8Array | null = null;
    let progress = 0;

    const me = this;

    await response.body.pipeTo(new WritableStream({
      write(chunk) {
        // console.log("new chunk");
        if (uint8Array === null) {
          // console.log("Initializing array");
          uint8Array = new Uint8Array(chunk);
          progress += chunk.length;
        } else {
          // FIXME : it could be more elegant to initialize it before
          let newArray = new Uint8Array(progress + chunk.length);
          newArray.set(uint8Array);
          newArray.set(chunk, progress);
          uint8Array = newArray;
          progress += chunk.length;
        }

        me.events?.emit('onProgress', {
          contentLength: null,
          currentProgress: progress,
          lastChunk: chunk,
          currentData: uint8Array
        });

        // console.log("progress: " + progress);
      },
      close() {
        console.log("close");
      },
      abort(e) {
        console.error("abort", e);
      }
    }));

    return uint8Array;
  }

}
