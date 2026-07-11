import sharp from "sharp";

/*
  Black-and-white PDF requirement (features-and-decisions.md, Export
  section): scene map and entity images are grayscale-converted server
  side before embedding. sharp is a new dependency added for this step
  (no image-processing library existed in the codebase before), chosen
  over a canvas-based pass since it's a single well-maintained library
  that already covers decode, grayscale, and re-encode in one call.

  Re-encoded to PNG regardless of source format: @react-pdf/renderer's
  Image component needs an explicit format when given raw bytes rather
  than a URL, and PNG avoids re-introducing JPEG chroma subsampling
  artifacts on what is now a single-channel image.
*/
export async function toGrayscalePng(bytes: Uint8Array): Promise<Buffer> {
  return sharp(bytes).grayscale().png().toBuffer();
}
