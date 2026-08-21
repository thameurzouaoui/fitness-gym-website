import { uploadImage } from '/app/backend/src/upload.js';

let ok = true;
function check(name, cond, extra = '') {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ' -> ' + extra : ''));
  if (!cond) ok = false;
}
const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ACCEPT cases: must get PAST the whitelist gate (fail later at sharp/blob with a DIFFERENT error)
async function gateAllows(name, filename, mime) {
  try {
    await uploadImage(buf, filename, 'products', mime);
    check(name, true, 'unexpected full success (blob token present?)');
  } catch (e) {
    check(name, !/Format non supporté/.test(e.message), e.message);
  }
}
// REJECT cases: must throw the whitelist error
async function gateRejects(name, filename, mime) {
  try {
    await uploadImage(buf, filename, 'products', mime);
    check(name, false, 'no error thrown');
  } catch (e) {
    check(name, /Format non supporté/.test(e.message));
  }
}

await gateAllows('jpg extension accepted', 'photo.jpg', '');
await gateAllows('jpeg extension accepted', 'photo.JPEG', '');
await gateAllows('png extension accepted', 'img.png', '');
await gateAllows('webp extension accepted', 'img.webp', 'application/octet-stream');
await gateAllows('gif mime accepted', 'noext', 'image/gif');
await gateAllows('mime wins over bad ext', 'file.bin', 'image/png');

await gateRejects('txt rejected', 'notes.txt', 'text/plain');
await gateRejects('heic rejected', 'iphone.heic', 'image/heic');
await gateRejects('pdf rejected', 'doc.pdf', 'application/pdf');
await gateRejects('no ext no mime rejected', '', '');

console.log(ok ? 'UPLOAD GATE TEST: ALL PASS' : 'UPLOAD GATE TEST: FAILURES');
process.exit(ok ? 0 : 1);
