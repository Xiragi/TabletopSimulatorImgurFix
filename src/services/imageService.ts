import { Jimp } from 'jimp';

export async function addGoldBorderToImage(pngPath: string, convertedPngPath: string): Promise<void> {
  const image = await Jimp.read(pngPath);
  const borderSize = 10;

  const colour = 0xFFC20AFF;

  for (let y = 0; y < image.bitmap.height; y++) {
    for (let x = 0; x < image.bitmap.width; x++) {
      if (
        y < borderSize || 
        y >= image.bitmap.height - borderSize || 
        x < borderSize || 
        x >= image.bitmap.width - borderSize
      ) {
        image.setPixelColor(colour, x, y);
      }
    }
  }
  await image.write(convertedPngPath as `${string}.${string}`);
}
