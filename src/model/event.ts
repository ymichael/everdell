import { EventType, EventName, EventNameToPlayerId } from "./types";

export class Event {
  readonly name: EventName;
  readonly type: EventType;

  constructor({ name, type }: { name: EventName; type: EventType }) {
    this.name = name;
    this.type = type;
  }

  static fromName(name: EventName): Event {
    return EVENT_REGISTRY[name];
  }

  static byType(type: EventType): EventName[] {
    return ((Object.entries(EVENT_REGISTRY) as unknown) as [EventName, Event][])
      .filter(([_, event]) => {
        return event.type === type;
      })
      .map(([name, _]) => {
        return name;
      });
  }
}

const EVENT_REGISTRY: Record<EventName, Event> = {
  [EventName.BASIC_FOUR_PRODUCTION_TAGS]: new Event({
    name: EventName.BASIC_FOUR_PRODUCTION_TAGS,
    type: EventType.BASIC,
  }),
  [EventName.BASIC_THREE_DESTINATION]: new Event({
    name: EventName.BASIC_THREE_DESTINATION,
    type: EventType.BASIC,
  }),
  [EventName.BASIC_THREE_GOVERNANCE]: new Event({
    name: EventName.BASIC_THREE_GOVERNANCE,
    type: EventType.BASIC,
  }),
  [EventName.BASIC_THREE_TRAVELER]: new Event({
    name: EventName.BASIC_THREE_TRAVELER,
    type: EventType.BASIC,
  }),
};

export const initialEventMap = (): EventNameToPlayerId => {
  const ret: EventNameToPlayerId = {};
  [...Event.byType(EventType.BASIC)].forEach((ty) => {
    ret[ty] = null;
  });
  return ret;
};
