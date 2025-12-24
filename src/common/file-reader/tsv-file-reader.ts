import { FileReaderInterface } from './file-reader.interface';
import EventEmitter from 'node:events';
import { createReadStream } from 'node:fs';

export default class TSVFileReader extends EventEmitter implements FileReaderInterface {
  constructor(public filename: string) {
    super();
  }

  public async read(): Promise<void> {
    const stream = createReadStream(this.filename, {
      highWaterMark: 2 ** 16,
      encoding: 'utf-8',
    });

    let buffer = '';
    let nextLineIndex = -1;
    let rowCount = 0;

    for await (const chunk of stream) {
      buffer += chunk.toString();

      while ((nextLineIndex = buffer.indexOf('\n')) >= 0) {
        const completeRow = buffer.slice(0, nextLineIndex + 1);
        buffer = buffer.slice(nextLineIndex + 1);
        rowCount++;

        await new Promise((resolve) => {
          this.emit('row', completeRow, resolve);
        });
      }
    }

    this.emit('end', rowCount);
  }
}
