import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createTransparentSignaturePng, removeWhiteMatte } from '../lib/signature-image.ts';

test('removes the white background while preserving black and colored ink', async () => {
  const pixels = Buffer.from([
    255, 255, 255, 255,
    0, 0, 0, 255,
    0, 0, 255, 255,
    255, 127, 127, 255,
  ]);

  assert.deepEqual([...removeWhiteMatte(pixels)], [
    0, 0, 0, 0,
    0, 0, 0, 255,
    0, 0, 255, 255,
    255, 0, 0, 186,
  ]);
});

test('converts a white-backed input image to a transparent PNG', async () => {
  const input = await sharp({
    create: {
      width: 2,
      height: 1,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).png().toBuffer();
  const output = await createTransparentSignaturePng(input);
  const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  assert.equal(info.format, 'raw');
  assert.equal(info.width, 2);
  assert.deepEqual([...data.subarray(0, 4)], [0, 0, 0, 0]);
});

test('trims empty image margins while keeping a small transparent print margin', async () => {
  const input = await sharp({
    create: {
      width: 40,
      height: 30,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{
    input: await sharp({
      create: {
        width: 8,
        height: 6,
        channels: 4,
        background: { r: 15, g: 35, b: 100, alpha: 255 },
      },
    }).png().toBuffer(),
    left: 16,
    top: 12,
  }]).png().toBuffer();
  const output = await createTransparentSignaturePng(input);
  const info = await sharp(output).metadata();

  assert.equal(info.width, 20);
  assert.equal(info.height, 18);
});

test('rejects malformed raw pixel data', () => {
  assert.throws(() => removeWhiteMatte(Buffer.from([255, 255, 255])), /complete pixels/);
});
