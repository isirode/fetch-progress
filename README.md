# fetch-progress

This is a library allowing to follow the progress of a fetch request.

## Features

- [x] Emit onProgress events
- [x] Emit onDone events
- [x] Similar API than the original fetch API
  - I am using a class instead of a method

## Using the library

```typescript
import { Events, FetchProgress } from "fetch-progress";

async function main() {
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
  events.on('onDone', ({data}) => {
    // do something with the data
  })

  const fetchProgress: FetchProgress = new FetchProgress(events);
  const arrayFile = await fetchProgress.fetch('https://word-guessing.isirode.ovh/grammalecte/db-fra-grammalecte-1.0.0.db');
  
  console.log(`array file size ${arrayFile.length}`);

  // You can use the data here
  // let utf8decoder = new TextDecoder();
  // console.log('data:');
  // console.log(utf8decoder.decode(arrayFile));
}

main();
```

## Importing the project

It is not published yet, so you will need to follow the steps below:
- Clone the project
- Build it `npm run build`
- Link it `npm link`
- Or use the single liner `npm run local`
- Then, you can import it in your project using `npm link fetch-progress`

Or, use the published package on Github, for instance:
- https://github.com/isirode/fetch-progress/releases/download/1.3.14/fetch-progress-1.3.14.tgz

### Dependencies

You should not need to do any custom imports.

## Know issues

Nothing here, yet.

## Partipating

Open the [DEVELOPER.md](./DEVELOPER.md) section.

## License

It is provided with the GNU LESSER GENERAL PUBLIC LICENSE.

This is a library allowing to follow the progress of a fetch request.
Copyright (C) 2023  Isirode

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
