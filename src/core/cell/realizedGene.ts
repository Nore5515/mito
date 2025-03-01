import mapRecord from "common/mapRecord";
import { clamp } from "math";
import { custom, identifier, serializable } from "serializr";
import uuid from "uuid";
import { Cell } from "../tile";
import { CellProperties } from "./cellProperties";
import { AllGenesByName, Gene } from "./gene";
import { GeneInstance } from "./geneInstance";
import { makeGeneUnknown } from "./GeneUnknown";

function serializeGeneIntoName(gene: Gene): string {
  const unknownRegex = /^Unknown \((.+)\)$/;
  const regexMatch = gene.blueprint.name.match(unknownRegex);
  // account for Unknown (${name})
  if (regexMatch != null) {
    const originalName = regexMatch[1];
    return originalName;
  }
  return gene.blueprint.name;
}

function deserializeGeneFromName(name: string): Gene {
  const gene = AllGenesByName.get(name);
  if (gene == null) {
    console.error("Couldn't load gene", name);
    return makeGeneUnknown(name);
  }
  return gene;
}

export class RealizedGene<G extends Gene = Gene> {
  @serializable(custom(serializeGeneIntoName, deserializeGeneFromName))
  public gene: G;

  @serializable
  public level!: number;

  @serializable(identifier())
  public readonly uuid = uuid();

  public constructor(gene?: G, level?: number) {
    this.gene = gene!;
    if (level != null) {
      this.setLevel(level);
    }
  }

  getStaticProperties() {
    const staticBlueprint = this.gene.blueprint.static || {};
    return mapRecord(staticBlueprint, (arr) => (Array.isArray(arr) ? arr[this.level] : arr)) as Partial<CellProperties>;
  }

  getDynamicProperties(cell: Cell, properties: CellProperties) {
    return this.gene.blueprint.dynamic?.(cell, properties);
  }

  public getProps() {
    return mapRecord(this.gene.blueprint.levelProps, (val) => (typeof val === "number" ? val : val[this.level]));
  }

  public getCost() {
    return this.gene.blueprint.levelCosts[this.level];
  }

  setLevel(newLevel: number): void {
    this.level = clamp(newLevel, 0, this.gene.numLevels - 1);
  }

  public newInstance(cell: Cell): GeneInstance<G> {
    return new GeneInstance(this.gene, this.getProps(), cell);
  }

  toString() {
    return `RealizedGene(${this.gene.blueprint.name} ${this.level} [${this.uuid}])`;
  }
}
