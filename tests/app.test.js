import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

beforeEach(() => {
  jest.resetModules();
});

test('logs error when manifest fetch fails', async () => {
  const file = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const pluginApiPath = path.join(__dirname, '../src/pluginApi.js');
  let code = file
    .replace("./pluginApi.js", `file://${pluginApiPath}`)
    .replace(/await loadPlugins\(\);[\s\S]*$/, 'export { loadPlugins };');
  const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`);

  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ['bad'] })
    .mockRejectedValueOnce(new Error('fail'));
  global.fetch = fetchMock;

  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await mod.loadPlugins();

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(errorSpy).toHaveBeenCalled();
});
