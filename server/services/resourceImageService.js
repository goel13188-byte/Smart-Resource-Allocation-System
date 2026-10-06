const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const uploadDirectory = path.join(__dirname, '../../client/public/uploads');
const mimeExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function saveResourceImage(dataUrl) {
  if (!dataUrl) return null;
  if (typeof dataUrl !== 'string') throw new Error('Image data must be a valid image upload.');

  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error('Use a PNG, JPEG, WebP, or GIF image.');

  const imageBuffer = Buffer.from(match[2], 'base64');
  if (!imageBuffer.length || imageBuffer.length > 3 * 1024 * 1024) {
    throw new Error('Images must be smaller than 3 MB.');
  }

  const filename = `${crypto.randomUUID()}.${mimeExtensions[match[1]]}`;
  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadDirectory, filename), imageBuffer, { flag: 'wx' });
  return `/uploads/${filename}`;
}

module.exports = { saveResourceImage };