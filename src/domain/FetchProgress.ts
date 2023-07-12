import Emittery from "emittery";
import { ILogger, LoggerFactory } from "log4j2-typescript";

const contentLengthKey = 'content-length';

export type RequiredFiltered<T, U extends keyof T> = Omit<T, U> & Required<Pick<T, U>>;

export interface FetchProgressData {
  input: RequestInfo | URL;
  init?: RequestInit | undefined;
}

export interface OnProgressData extends FetchProgressData {
  contentLength: number | null;
  currentProgress: number;
  lastChunk: Uint8Array;
  currentData: Uint8Array;
}

export interface OnErrorData extends FetchProgressData {
  error: Error;
}

export interface OnDoneData extends FetchProgressData {
  response: IFetchResponse;
}

export interface Events {
  onProgress: OnProgressData;
  onError: OnErrorData;
  onDone: OnDoneData;
}

export interface IFetchResponse {
  status: number;
  statusText: string;
  data: Uint8Array | undefined;
  headers?: Map<string, string>;
}

export class FetchResponse implements IFetchResponse {

  get status(): number {
    return this.response.status;
  }

  get statusText(): string {
    return this.response.statusText;
  }

  data: Uint8Array | undefined;
  headers?: Map<string, string> = new Map();

  response: Response;

  constructor(response: Response) {
    this.response = response;
    const self = this;
    response.headers.forEach((value, key) => {
      self.headers?.set(key, value);
    });
  }

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

  logger: ILogger = LoggerFactory.getLogger('com.isirode.fetch-progress');

  events?: Emittery<Events>;

  constructor(events?: Emittery<Events>) {
    this.events = events;
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<IFetchResponse> {
    this.logger.debug('fetch', {input});
    let uint8Array: Uint8Array | null = null;
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (err: unknown) {
      // Info : throw {} when there is a CORS issue, or other kind of issue related to HTTP
      // The error will be in the browser but is not available here, or available to WebDriverIO
      // It can be a 404 that failed before the actual request is made
      this.logger.error('a http error occurred', {}, err as Error);
      this.events?.emit('onError', {
        input: input,
        init: init,
        error: err as Error
      });
      throw err;
    }
    if (response === null) {
      const error = new Error('fetch response is null');
      this.events?.emit('onError', {
        input: input,
        init: init,
        error: error
      });
      throw error;
    }
    if (response.body === null) {
      const error = new Error('fetch response body is null');
      this.events?.emit('onError', {
        input: input,
        init: init,
        error: error
      });
      throw error;
    }
    
    this.logger.debug(`status: ${response.status} ${response.statusText}`);
    // not working
    // this.logger.debug(`Headers : ${JSON.stringify(response.headers)}`);
    // not working
    // this.logger.debug(`Headers : `, {...response.headers});
    // not working
    // this.logger.debug(`Headers : ${JSON.stringify({...response.headers})}`);
    response.headers.forEach((value, key) => {
      this.logger.debug(key + ':' + value);
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
      uint8Array = await this.getResponseContentWithKnownContentLength(response, contentLengthInt, input, init);
    } else {
      uint8Array = await this.getResponseContentWithUnknownContentLength(response, input, init);
    }

    // TODO : fix this, should not be null
    if (uint8Array === null) {
      const error = new Error("data is null after fetch");
      this.events?.emit('onError', {
        input: input,
        init: init,
        error: error
      });
      throw error;
    }

    const fetchResponse = new FetchResponse(response);
    fetchResponse.data = uint8Array;

    this.events?.emit('onDone', {
      input: input,
      init: init,
      response: fetchResponse
    });

    return fetchResponse;
  }

  async getResponseContentWithKnownContentLength(response: RequiredFiltered<Response, "body">, contentLength: number, input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Uint8Array | null> {
    // TODO : same thing as RequiredFiltered but with null property
    // Maybe use Zod
    // It would need ZodType I think
    if (response.body === null) {
      const error = new Error('fetch response body is null');
      this.events?.emit('onError', {
        input: input,
        init: init,
        error: error
      });
      throw error;
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
          input: input,
          init: init,
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

  async getResponseContentWithUnknownContentLength(response: Response, input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Uint8Array | null> {

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
          input: input,
          init: init,
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
