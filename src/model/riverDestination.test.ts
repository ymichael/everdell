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

      expect(riverMap.spots.SHOAL.name).to.be(RiverDestinationName.SHOAL);

      Object.values(riverMap.spots).forEach(
        ({ name, revealed, ambassadors }) => {
          if (!name) {
            throw new Error(`Unexpected name: ${name}`);
          }
          const riverDestination = RiverDestination.fromName(name);
          typeToCount[riverDestination.type] += 1;
          if (name === RiverDestinationName.SHOAL) {
            expect(revealed).to.be(true);
          } else {
            expect(revealed).to.be(false);
          }
          expect(ambassadors).to.eql([]);
        }
      );

      expect(typeToCount).to.eql({
        [RiverDestinationType.SHOAL]: 1,
        [RiverDestinationType.LOCATION]: 2,
        [RiverDestinationType.CITIZEN]: 2,
      });
    });
  });

  describe("toJSON/fromJSON", () => {
    it("should hide unrevealed destinations if includePrivate is false", () => {
      const riverMap = initialRiverDestinationMap();

      let riverMapJSON = riverMap.toJSON(false);
      expect(riverMapJSON.spots.SHOAL.name).to.not.be(null);

      expect(riverMapJSON.spots.THREE_PRODUCTION.name).to.be(null);
      expect(riverMapJSON.spots.TWO_DESTINATION.name).to.be(null);
      expect(riverMapJSON.spots.TWO_TRAVELER.name).to.be(null);
      expect(riverMapJSON.spots.TWO_GOVERNANCE.name).to.be(null);

      riverMapJSON = riverMap.toJSON(true);
      expect(riverMapJSON.spots.SHOAL.name).to.not.be(null);

      expect(riverMapJSON.spots.THREE_PRODUCTION.name).to.not.be(null);
      expect(riverMapJSON.spots.TWO_DESTINATION.name).to.not.be(null);
      expect(riverMapJSON.spots.TWO_TRAVELER.name).to.not.be(null);
      expect(riverMapJSON.spots.TWO_GOVERNANCE.name).to.not.be(null);
    });

    it("should not hide revealed destinations", () => {
      const riverMap = initialRiverDestinationMap();
      riverMap.spots.THREE_PRODUCTION.revealed = true;

      let riverMapJSON = riverMap.toJSON(false);
      expect(riverMapJSON.spots.SHOAL.name).to.not.be(null);
      expect(riverMapJSON.spots.THREE_PRODUCTION.name).to.not.be(null);

      expect(riverMapJSON.spots.TWO_DESTINATION.name).to.be(null);
      expect(riverMapJSON.spots.TWO_TRAVELER.name).to.be(null);
      expect(riverMapJSON.spots.TWO_GOVERNANCE.name).to.be(null);
    });
  });
});
