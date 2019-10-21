import Mito from "sketches/mito";
import { Tile, GrowingCell } from "sketches/mito/game/tile";
import { WebGLRenderTarget, Vector2, OrthographicCamera, Scene } from "three";
import { createRendererFor } from "sketches/mito/renderers/WorldRenderer";
import { map } from "math";

/**
 * A Vignette is a visual snapshot of a plant at a specific stage of growth. It's actually
 * just an image.
 *
 * You can control:
 *   How big the vignette is.
 */
class VignetteCapturer {

  static renderTarget = new WebGLRenderTarget(1024, 1024);
  static rtBuffer = new Uint8Array(VignetteCapturer.renderTarget.width * VignetteCapturer.renderTarget.height * 4);
  static rtCanvas = (() => {
    const c = document.createElement("canvas");
    c.width = VignetteCapturer.renderTarget.width;
    c.height = VignetteCapturer.renderTarget.height;
    return c;
  })();
  public constructor(public readonly mito: Mito, public pxPerTile = 4) {
  }

  capture() {
    const { renderTarget, rtBuffer, rtCanvas } = VignetteCapturer;

    // Cells that form the vignette:
    const picturesqueCells = Array.from(this.mito.world.cells())
      .filter((t) => t.pos.y < 50 && !(t instanceof GrowingCell));

    const [minBounds, maxBounds] = this.getBounds(picturesqueCells);

    // add all renderers to a scene
    const scene = new Scene();
    const tileRenderers = picturesqueCells.map((c) => {
      const renderer = createRendererFor(c, scene, this.mito);
      renderer.update();
      return renderer;
    });

    // webgl render to a renderTarget
    const camera = this.cameraEncompassingBounds([minBounds, maxBounds]);
    const { renderer } = this.mito;
    renderer.setRenderTarget(renderTarget);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    // buffer will now contain [r1, g1, b1, a1, r2, g2, b2, a2, ...]
    renderer.readRenderTargetPixels(
      renderTarget,
      0,
      0,
      renderTarget.width,
      renderTarget.height,
      rtBuffer
    );

    // copy buffer pixels into the full resolution canvas
    const context = rtCanvas.getContext('2d')!;
    const imageData: ImageData = context.createImageData(rtCanvas.width, rtCanvas.height);
    const imageBuffer = imageData.data;
    for (let i = 0; i < rtBuffer.length; i++) {
      imageBuffer[i] = rtBuffer[i];
    }
    context.putImageData(imageData, 0, 0);

    const boundsWidth = maxBounds.x - minBounds.x;
    const boundsHeight = maxBounds.y - minBounds.y;
    const maxDimension = Math.max(boundsWidth, boundsHeight);

    const roiWidth = map(boundsWidth, 0, maxDimension, 0, 1024);
    const roiHeight = map(boundsHeight, 0, maxDimension, 0, 1024);
    const roiTopLeft = new Vector2(
      512 - roiWidth / 2,
      512 - roiHeight / 2
    );

    const dest = document.createElement("canvas");
    dest.width = Math.ceil(boundsWidth * this.pxPerTile);
    dest.height = Math.ceil(boundsHeight * this.pxPerTile);
    const destContext = dest.getContext('2d')!;
    destContext.drawImage(
      rtCanvas,
      roiTopLeft.x,
      roiTopLeft.y,
      roiWidth,
      roiHeight,
      0,
      0,
      dest.width,
      dest.height
    );

    const img = new Image();
    img.src = dest.toDataURL();
    document.body.appendChild(img);

    tileRenderers.forEach((t) => {
      t.destroy();
    });
    return dest;
  }

  getBounds(tiles: Tile[]): [Vector2, Vector2] {
    const min = new Vector2();
    const max = new Vector2();
    if (tiles[0] != null) {
      min.copy(tiles[0].pos);
      max.copy(tiles[0].pos);
    }
    for (const t of tiles) {
      min.min(t.pos);
      max.max(t.pos);
    }
    // .pos is the center; pad to the edges of each tile
    min.subScalar(0.5);
    max.addScalar(0.5);
    return [min, max];
  }

  private cameraEncompassingBounds([min, max]: [Vector2, Vector2]) {
    const center = min.clone().lerp(max, 0.5);

    const width = max.x - min.x;
    const height = max.y - min.y;

    // now that we know the bounding box, we want the camera to fit that bounding
    // box perfectly while maintaining the aspect ratio of the renderTarget.
    const largerDim = Math.max(width, height);
    const camera = new OrthographicCamera(
      center.x - largerDim / 2,
      center.x + largerDim / 2,
      center.y + largerDim / 2,
      center.y - largerDim / 2,
      -100,
      100);
    return camera;
  }
}

export default VignetteCapturer;
