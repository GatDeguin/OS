import { jest } from "@jest/globals";
let fs;
let storage;

beforeEach(async () => {
  jest.resetModules();
  storage = {};
  global.localStorage = {
    getItem: (k) => storage[k],
    setItem: (k, v) => { storage[k] = v; }
  };
  fs = (await import('../src/fs.js')).default;
});

test('mkdir creates directories and ls lists them', () => {
  fs.mkdir('/test/dir');
  expect(fs.ls('/')).toContain('test');
  expect(fs.ls('/test')).toContain('dir');
});

test('write creates file and cat reads it', () => {
  fs.mkdir('/dir');
  fs.write('/dir/file.txt', 'hello');
  expect(fs.cat('/dir/file.txt')).toBe('hello');
});

test('ls throws when path is not directory', () => {
  fs.write('/afile', 'x');
  expect(() => fs.ls('/afile')).toThrow();
});

test('cat throws when file does not exist', () => {
  expect(() => fs.cat('/missing')).toThrow();
});
