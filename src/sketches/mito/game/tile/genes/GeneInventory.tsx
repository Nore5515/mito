import React from "react";
import GN from "sketches/mito/ui/GN";
import { Gene } from "../chromosome";
export const GeneInventory = Gene.make(
  {
    name: "Inventory",
    levelCosts: [1, 2, 3, 4, 5],
    levelProps: {},
    static: {
      inventoryCapacity: [2, 3, 5, 8, 11],
    },
    description: (_, { inventoryCapacity }) => (
      <>
        Capacity <GN value={inventoryCapacity!} />.
      </>
    ),
  },
  {},
  () => {}
);
export type GeneInventory = typeof GeneInventory;
