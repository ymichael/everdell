import {
  GameText,
  TextPart,
  CardName,
  ResourceType,
  CardType,
  GameInputType,
  IGameTextEntity,
  WorkerPlacementInfo,
  ProductionResourceMap,
  GameInputMultiStep,
} from "./types";
import flatten from "lodash/flatten";
import { assertUnreachable } from "../utils";

function isGameTextEntity(x: any): x is IGameTextEntity {
  return !!x?.getGameTextPart;
}

export function toGameText(
  strOrArr: string | (string | TextPart | IGameTextEntity)[]
): GameText {
  if (typeof strOrArr === "string") {
    return strToGameText(strOrArr);
  }

  return flatten(
    strOrArr.map((x) => {
      if (typeof x === "string") {
        return strToGameText(x);
      } else if (isGameTextEntity(x)) {
        return x.getGameTextPart();
      } else {
        return x;
      }
    })
  );
}

// helper to convert string into GameText type
function strToGameText(str: string): GameText {
  const ret: GameText = [];
  let textBuffer: string[] = [];

  splitOnSpaceOrPunc(str).forEach((part) => {
    if (Object.values(ResourceType).includes(part as any) || part === "ANY") {
      ret.push({ type: "text", text: textBuffer.join("") });
      ret.push({
        type: "resource",
        resourceType: part as ResourceType | "ANY",
      });
      textBuffer = [];
    } else if (Object.values(CardType).includes(part as any)) {
      ret.push({ type: "text", text: textBuffer.join("") });
      ret.push({
        type: "cardType",
        cardType: part as CardType,
      });
      textBuffer = [];
    } else if (part === "VP" || part === "CARD") {
      ret.push({ type: "text", text: textBuffer.join("") });
      ret.push({ type: "symbol", symbol: part });
      textBuffer = [];
    } else {
      textBuffer.push(part);
    }
  });
  if (textBuffer.length) {
    ret.push({ type: "text", text: textBuffer.join("") });
  }
  return ret;
}

function splitOnSpaceOrPunc(str: string): string[] {
  const ret: string[] = [];
  let textBuffer: string[] = [];
  str.split("").forEach((x) => {
    if (x === " " || x === "," || x === "." || x === "/" || x === ")") {
      ret.push(textBuffer.join(""));
      ret.push(x);
      textBuffer = [];
    } else {
      textBuffer.push(x);
    }
  });
  ret.push(textBuffer.join(""));
  return ret;
}

export function cardListToGameText(cards: CardName[]): GameText {
  const ret: GameText = [];
  for (let i = 0; i < cards.length; i++) {
    if (i !== 0) {
      if (i === cards.length - 1) {
        ret.push({ type: "text", text: " & " });
      } else {
        ret.push({ type: "text", text: ", " });
      }
    }
    ret.push({
      type: "entity",
      entityType: "card",
      card: cards[i],
    });
  }
  return ret;
}

export function resourceMapToGameText(
  resources: ProductionResourceMap
): GameText {
  const ret: GameText = [];

  const resourceTypes = (Object.keys(
    resources
  ) as (keyof typeof resources)[]).filter((resourceType) => {
    return !!resources[resourceType];
  });

  for (let i = 0; i < resourceTypes.length; i++) {
    const resourceType = resourceTypes[i];
    if (i !== 0) {
      if (i === resourceTypes.length - 1) {
        ret.push({ type: "text", text: " & " });
      } else {
        ret.push({ type: "text", text: ", " });
      }
    }
    ret.push({ type: "text", text: `${resources[resourceType]} ` });
    if (resourceType === "CARD") {
      ret.push({ type: "symbol", symbol: "CARD" });
    } else {
      ret.push({ type: "resource", resourceType: resourceType });
    }
  }
  return ret;
}

export function workerPlacementToGameText(
  workerPlacementInfo: WorkerPlacementInfo
): GameText {
  if (workerPlacementInfo.location) {
    return [
      {
        type: "entity" as const,
        entityType: "location" as const,
        location: workerPlacementInfo.location,
      },
    ];
  } else if (workerPlacementInfo.event) {
    return [
      {
        type: "entity" as const,
        entityType: "event" as const,
        event: workerPlacementInfo.event,
      },
    ];
  } else if (workerPlacementInfo.playedCard) {
    return [
      {
        type: "entity" as const,
        entityType: "card" as const,
        card: workerPlacementInfo.playedCard.cardName,
      },
    ];
  } else {
    assertUnreachable(workerPlacementInfo, JSON.stringify(workerPlacementInfo));
  }
}

export function inputContextPrefix(gameInput: GameInputMultiStep): GameText {
  if (gameInput.cardContext) {
    return [
      { type: "entity", entityType: "card", card: gameInput.cardContext },
      { type: "text", text: ": " },
    ];
  }
  if (gameInput.locationContext) {
    return [
      {
        type: "entity",
        entityType: "location",
        location: gameInput.locationContext,
      },
      { type: "text", text: ": " },
    ];
  }
  if (gameInput.eventContext) {
    return [
      { type: "entity", entityType: "event", event: gameInput.eventContext },
      { type: "text", text: ": " },
    ];
  }
  if (gameInput.riverDestinationContext) {
    return [
      {
        type: "entity",
        entityType: "riverDestination",
        riverDestination: gameInput.riverDestinationContext,
      },
      { type: "text", text: ": " },
    ];
  }
  if (gameInput.adornmentContext) {
    return [
      {
        type: "entity",
        entityType: "adornment",
        adornment: gameInput.adornmentContext,
      },
      { type: "text", text: ": " },
    ];
  }
  if (gameInput.prevInputType === GameInputType.PREPARE_FOR_SEASON) {
    return [{ type: "em", text: "Prepare for Season: " }];
  }
  return [];
}
