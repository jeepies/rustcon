import { Socket } from 'net';
import { EventEmitter } from 'events';
import { Options } from './types/Options';
import { Request } from './types/Request';
import { Response, ResponseType } from './types/Response';

export class RustCon extends EventEmitter {
  private socket: Socket;
  private options: Options;
  private requestId = 0;
  private queue: Request[] = [];
  private pending = false;
  private buffer = Buffer.alloc(0);

  constructor(options: Options) {
    super();
    this.options = options;
    this.socket = new Socket();
    this.createSocket();
  }

  private createSocket() {
    const { timeout } = this.options;
    this.socket.setTimeout(timeout || 5000);
    this.socket.on('connect', () => this.authenticate());
    this.socket.on('data', (data) => this.onData(data));
    this.socket.on('timeout', () => this.emit('error', new Error('Socket timeout')));
    this.socket.on('error', (err) => this.emit('error', err));
    this.socket.on('close', (hadError) => this.emit('close', hadError));
  }

  private authenticate() {
    this.sendRaw(`login ${this.options.password}`)
      .then(() => this.emit('ready'))
      .catch(err => this.emit('error', err));
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let response: Response | null;
    while ((response = this.tryParse()) !== null) {
      this.handleResponse(response);
    }
  }

  private tryParse(): Response | null {
    if (this.buffer.length < 12) return null; // header length
    const len = this.buffer.readInt32LE(0);
    if (this.buffer.length < len + 4) return null;

    const id = this.buffer.readInt32LE(4);
    const type = this.buffer.readInt32LE(8);
    const body = this.buffer.slice(12, 4 + len - 2).toString('utf8');

    this.buffer = this.buffer.slice(4 + len);
    return { id, type, body };
  }

  private handleResponse(res: Response) {
    if (res.type === ResponseType.SERVERDATA_AUTH_RESPONSE) {
      if (res.id === -1) return this.emit('error', new Error('Auth failed'));
    } else {
      this.emit('raw', res);
      this.emit('response', res.body);
      this.processQueue(res);
    }
  }

  private processQueue(res: Response) {
    const req = this.queue.shift();
    this.pending = false;
    if (req) this.emit(`command_${req.id}`, res.body);
    this.next();
  }

  private next() {
    if (this.pending) return;
    const req = this.queue[0];
    if (!req) return;
    this.pending = true;
    this.sendPacket(req.id, 2, req.command);
  }

  private sendRaw(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const event = `command_${id}`;
      this.once(event, resolve);
      this.once('error', reject);
      this.queue.push({ id, command });
      this.next();
    });
  }

  private sendPacket(id: number, type: number, body: string) {
    const bodyBuf = Buffer.from(body, 'utf8');
    const len = 4 + 4 + bodyBuf.length + 2;
    const buf = Buffer.alloc(4 + len);
    buf.writeInt32LE(len, 0);
    buf.writeInt32LE(id, 4);
    buf.writeInt32LE(type, 8);
    bodyBuf.copy(buf, 12);
    buf.writeInt16LE(0, 12 + bodyBuf.length);
    buf.writeInt16LE(0, 14 + bodyBuf.length);
    this.socket.write(buf);
  }

  connect() {
    const { port, host } = this.options;
    this.socket.connect(port, host);
  }

  disconnect() {
    this.socket.end();
  }

  exec(commad: string) {
    return this.sendRaw(commad);
  }

  status() {
    return this.exec('status');
  }
}
