// DB-free unit tests for photo storage (local disk vs Vercel Blob). Run: node --test tests/storage.unit.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function freshStorage() {
  delete require.cache[require.resolve('../src/services/storage')];
  return require('../src/services/storage');
}

test('without a Blob token photos stay local', async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const s = freshStorage();
  assert.equal(s.useBlob(), false);
  assert.equal(await s.save({ filename: 'a.jpg' }), '/uploads/a.jpg');
});

test('with a Blob token the photo is sent to Vercel Blob and the returned URL is stored', async () => {
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  const calls = [];
  const original = Module._load;
  Module._load = function (request, ...rest) {
    if (request === '@vercel/blob') {
      return { put: async (name, buf, opts) => { calls.push({ name, buf, opts }); return { url: 'https://abc.public.blob.vercel-storage.com/' + name }; }, del: async () => {} };
    }
    return original.call(this, request, ...rest);
  };
  try {
    const s = freshStorage();
    assert.equal(s.useBlob(), true);
    const url = await s.save({ mimetype: 'image/png', buffer: Buffer.from('x') });
    assert.match(url, /^https:\/\/abc\.public\.blob\.vercel-storage\.com\/property-images\/\d+-[0-9a-f]{16}\.png$/);
    assert.equal(calls[0].opts.access, 'public');
    assert.equal(calls[0].opts.contentType, 'image/png');
  } finally {
    Module._load = original;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
});

test('remove never touches other hosts (demo images) and never throws', async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const s = freshStorage();
  await s.remove('https://images.example.com/demo.jpg', '/nonexistent');
  await s.remove(null, '/nonexistent');
});
