import expect from "expect.js";
import { RiverDestinationName, RiverDestinationType } from "./types";
import {
  RiverDestination,
  initialRiverDestinationMap,
} from "./riverDestination";

describe("RiverDestination", () => {
  describe("initialRiverDestinationMap", () => {
    it("should return 2 random CITIZEN and 2 random LOCATION river destinations", () => {
      const riverMap = initialRiverDestinationMap();
      const typeToCount = {
        [RiverDestinationType.SHOAL]: 0,
        [RiverDestinationType.LOCATION]: 0,
        [RiverDestinationType.CITIZEN]: 0,
      };

      expect(riverMap.SHOAL.name).to.be(RiverDestinationName.SHOAL);

      Object.values(riverMap).forEach(({ name, revealed, ambassadors }) => {
        const riverDestination = RiverDestination.fromName(name);
        typeToCount[riverDestination.type] += 1;
        if (name === RiverDestinationName.SHOAL) {
          expect(revealed).to.be(true);
        } else {
          expect(revealed).to.be(false);
        }
        expect(ambassadors).to.eql([]);
      });

      expect(typeToCount).to.eql({
        [RiverDestinationType.SHOAL]: 1,
        [RiverDestinationType.LOCATION]: 2,
        [RiverDestinationType.CITIZEN]: 2,
      });
    });
  });
});
