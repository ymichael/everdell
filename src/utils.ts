import {
  GameLogEntry,
  GameText,
  TextPart,
  ResourceType,
  CardType,
} from "./model/types";
import flatten from "lodash/flatten";

export function assertUnreachable(x: never, msg: string): never {
  throw new Error(msg);
}

// helper to convert strings into GameText type
export function strToGameText(
  strOrStrArr: string | (string | TextPart)[]
): GameText {
  if (typeof strOrStrArr !== "string") {
    return flatten(
      strOrStrArr.map((x) => {
        return typeof x === "string" ? strToGameText(x) : x;
      })
    );
  }

  const ret: GameText = [];
  let textBuffer: string[] = [];

  splitOnSpaceOrPunc(strOrStrArr).forEach((part) => {
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
    if (x === " " || x === "," || x === ".") {
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
