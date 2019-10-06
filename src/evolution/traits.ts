import { Gene, DNATuple } from "./gene";

export type TraitValue = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export type Traits = {
  /**
   * How fast the cell walks across this tile. Higher is faster.
   */
  walkSpeed: TraitValue;
  /**
   * How slower the cell consumes energy. Higher is lower energy usage
   * for the same behavior.
   */
  energyEfficiency: TraitValue;
  /**
   * How well this cell photosynthesizes. Higher is faster photosynthesis.
   */
  photosynthesis: TraitValue;
  /**
   * How well this cell absorbs nutrients and water from roots. Higher is
   * faster absorption rate.
   */
  rootAbsorption: TraitValue;
  /**
   * How many resources this cell can carry.
   */
  carryCapacity: TraitValue;
  /**
   * Whether this cell actively transports water. Higher means faster
   * water transport.
   */
  activeTransportWater: TraitValue;
  /**
   * Whether this cell actively transports sugar. Higher means faster
   * sugar transport.
   */
  activeTransportSugar: TraitValue;
  /**
   * How stable this cell is against gravity, weight, and wind forces.
   * Higher is more stable.
   */
  structuralStability: TraitValue;
  /**
   * How easily this cell passively diffuses water. Higher means faster diffusion.
   */
  diffuseWater: TraitValue;
  /**
   * How easily this cell passively diffuses sugar. Higher means faster diffusion.
   */
  diffuseSugar: TraitValue;
  /**
   * How quickly this cell builds.
   */
  buildTime: TraitValue;
};

export type TraitDiff = Partial<Traits> & {
  [traitName: string]: TraitValue;
};

export type TraitType = keyof Traits;

export function emptyTraits(): Traits {
  return {
    carryCapacity: 0,
    energyEfficiency: 0,
    photosynthesis: 0,
    rootAbsorption: 0,
    structuralStability: 0,
    activeTransportSugar: 0,
    activeTransportWater: 0,
    walkSpeed: 0,
    diffuseWater: 0,
    diffuseSugar: 0,
    buildTime: 0,
  };
}

/**
 * Mutates source.
 * @param source source
 * @param modifier modifier
 */
export function addTraits(source: TraitDiff, modifier: TraitDiff) {
  for (const traitType in modifier) {
    source[traitType] = clampToTraitValue((source[traitType] || 0) + modifier[traitType]!);
  }
}

export function clampToTraitValue(t: number): TraitValue {
  return (t < -3 ? -3 : t > 3 ? 3 : t) as TraitValue;
}

export function getTraits(genes: Gene[]): Traits {
  const traits: Traits = emptyTraits();
  for (const gene of genes) {
    const traitDiff = getTraitInfluence(gene);
    addTraits(traits, traitDiff);
  }
  return traits;
}

export function getTraitInfluence(gene: Gene): TraitDiff {
  const traitDiff: TraitDiff = {};
  const traitTypePlus = dnaPairToTraitType(gene[0]);
  if (traitTypePlus != null) {
    traitDiff[traitTypePlus] = 1;
  }

  const traitTypeMinus = dnaPairToTraitType(gene[0]);
  if (traitTypeMinus != null) {
    traitDiff[traitTypeMinus] = -1;
  }
  return traitDiff;
}

export function dnaPairToTraitType(dnaTuple: DNATuple): TraitType | undefined {
  switch (dnaTuple) {
    case "AA":
      return "walkSpeed";
    case "AC":
      return "energyEfficiency";
    case "AG":
      return "photosynthesis";
    case "AT":
      return "rootAbsorption";

    case "CA":
      return "carryCapacity";
    case "CC":
      return "activeTransportSugar";
    case "CG":
      return "activeTransportWater";
    case "CT":
      return "structuralStability";

    case "GA":
      return "diffuseSugar";
    case "GC":
      return "diffuseWater";

    default:
      return undefined;
  }
}

export function traitMod(val: TraitValue, base: number, exponent: number) {
  return base * Math.pow(exponent, val);
}
