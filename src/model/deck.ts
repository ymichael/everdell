import { CardName, GameOptions } from "./types";
import { Card } from "./card";
import { CardStack } from "./cardStack";

const baseGameCards: CardName[] = [
  CardName.ARCHITECT,
  CardName.BARD,
  CardName.BARGE_TOAD,
  CardName.CASTLE,
  CardName.CEMETARY,
  CardName.CHAPEL,
  CardName.CHIP_SWEEP,
  CardName.CLOCK_TOWER,
  CardName.COURTHOUSE,
  CardName.CRANE,
  CardName.DOCTOR,
  CardName.DUNGEON,
  CardName.EVERTREE,
  CardName.FAIRGROUNDS,
  CardName.FARM,
  CardName.FOOL,
  CardName.GENERAL_STORE,
  CardName.HISTORIAN,
  CardName.HUSBAND,
  CardName.INN,
  CardName.INNKEEPER,
  CardName.JUDGE,
  CardName.KING,
  CardName.LOOKOUT,
  CardName.MINE,
  CardName.MINER_MOLE,
  CardName.MONASTERY,
  CardName.MONK,
  CardName.PALACE,
  CardName.PEDDLER,
  CardName.POST_OFFICE,
  CardName.POSTAL_PIGEON,
  CardName.QUEEN,
  CardName.RANGER,
  CardName.RESIN_REFINERY,
  CardName.RUINS,
  CardName.SCHOOL,
  CardName.SHEPHERD,
  CardName.SHOPKEEPER,
  CardName.STOREHOUSE,
  CardName.TEACHER,
  CardName.THEATRE,
  CardName.TWIG_BARGE,
  CardName.UNDERTAKER,
  CardName.UNIVERSITY,
  CardName.WANDERER,
  CardName.WIFE,
  CardName.WOODCARVER,
];

const pearlbrookCards: CardName[] = [
  CardName.BRIDGE,
  CardName.FERRY,
  CardName.FERRY_FERRET,
  CardName.HARBOR,
  CardName.MESSENGER,
  CardName.PIRATE,
  CardName.PIRATE_SHIP,
  CardName.SHIPWRIGHT,
];

export const initialDeck = ({
  pearlbrook,
}: Pick<GameOptions, "pearlbrook">): CardStack<CardName> => {
  const cardStack = new CardStack<CardName>({ name: "Deck", cards: [] });

  baseGameCards.forEach((cardName) => {
    const card = Card.fromName(cardName);
    for (let i = 0; i < card.numInDeck; i++) {
      cardStack.addToStack(cardName);
    }
  });

  if (pearlbrook) {
    pearlbrookCards.forEach((cardName) => {
      const card = Card.fromName(cardName);
      for (let i = 0; i < card.numInDeck; i++) {
        cardStack.addToStack(cardName);
      }
    });
  }

  return cardStack;
};

export const legendaryCritters = (): CardStack<CardName> => {
  return new CardStack<CardName>({
    name: "Legendary Critters",
    cards: [
      CardName.AMILLA_GLISTENDEW,
      CardName.CIRRUS_WINDFALL,
      CardName.FORESIGHT,
      CardName.FYNN_NOBLETAIL,
      CardName.POE,
    ],
  });
};

export const legendaryConstructions = (): CardStack<CardName> => {
  return new CardStack<CardName>({
    name: "Legendary Constructions",
    cards: [
      CardName.BRIDGE_OF_THE_SKY,
      CardName.MCGREGORS_MARKET,
      CardName.OLEANDERS_OPERA_HOUSE,
      CardName.SILVER_SCALE_SPRING,
      CardName.THE_GREEN_ACORN,
    ],
  });
};
