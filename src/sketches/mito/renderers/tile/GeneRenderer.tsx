import { Gene, GeneInstance } from "sketches/mito/game/tile/chromosome";
import { Renderer } from "../Renderer";
import { InstancedTileRenderer } from "./InstancedTileRenderer";

export abstract class GeneRenderer<G extends Gene = Gene> extends Renderer<GeneInstance<G>> {
  constructor(t: GeneInstance<G>, public tr: InstancedTileRenderer) {
    super(t, tr.scene, tr.mito);
  }

  abstract hover(): void;
}
