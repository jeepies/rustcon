import { RustCon } from "..";
import { Options } from "../types/Options";

const config: Options = {
    host: 'localhost',
    port: 28016,
    password: 'testpass'
}

describe('Integration: RustCon & RustDedicated', () => {
    let client: RustCon;

    jest.setTimeout(30000);

    beforeAll(done => {
        client = new RustCon(config);
        client.on('ready', () => done());
        client.on('error', (err) => done(err));
        client.connect();
    })

    afterAll(() => client.disconnect());

    test('exec() can run arbitrary commands', async() => {
        const version = await client.exec('version');
        expect(typeof version).toBe('string');
        console.log(version);
    })
});