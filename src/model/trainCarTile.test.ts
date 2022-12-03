import expect from "expect.js";
import { TrainCarTileName } from "./types";
import { TrainCarTileStack, intialTrainCarTileStack } from "./trainCarTile";

describe("TrainCarTileStack", () => {
  it("json round-trip", () => {
    const stack = intialTrainCarTileStack();
    const stackJSON = stack.toJSON(true /* includePrivate */);
    expect(stackJSON).to.eql(
      TrainCarTileStack.fromJSON(stackJSON).toJSON(true)
    );
    expect(stackJSON.revealed.length).to.be(3);
    expect(stackJSON.rest.length).to.eql(6 * 3 - 3);
  });

  it("json public view should only show revealed tiles", () => {
    const stack = intialTrainCarTileStack();
    const stackJSON = stack.toJSON(false /* includePrivate */);
    expect(stackJSON.revealed.length).to.be(3);
    expect(stackJSON.rest).to.eql([]);
  });

  it("peekAt and replaceAt should work", () => {
    const stack = intialTrainCarTileStack();
    const stackJSON = stack.toJSON(true /* includePrivate */);
    const [a1, _, c1] = [stack.peekAt(0), stack.peekAt(1), stack.peekAt(2)];

    const b2Expected = stackJSON.rest[0];
    const b2 = stack.replaceAt(1);
    expect(b2).to.eql(b2Expected);

    expect(stack.peekAt(0)).to.eql(a1);
    expect(stack.peekAt(1)).to.eql(b2);
    expect(stack.peekAt(2)).to.eql(c1);
  });

  it("cycle through all the tiles", () => {
    const seen = new Set<TrainCarTileName>();
    const stack = intialTrainCarTileStack();
    for (let i = 0; i <= 18; i++) {
      seen.add(stack.replaceAt(0));
    }
    expect(seen.size).to.be(6);
  });
});
