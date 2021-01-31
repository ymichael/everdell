import * as React from "react";
import Image from "next/image";

import styles from "../styles/common.module.css";
import { Event } from "../model/event";
import { RiverDestinationSpot } from "../model/riverDestination";
import { Location } from "../model/location";
import { GameText, TextPart, ResourceType, CardType } from "../model/types";
import { assertUnreachable } from "../utils";

export const GameBlockTitle: React.FC = ({ children }) => {
  return (
    <div id={"js-game-block-title"} className={styles.title}>
      {children}
    </div>
  );
};

export const GameBlock: React.FC<{ title: string; id?: string }> = ({
  title,
  id,
  children,
}) => {
  return (
    <div id={id} className={styles.block}>
      <GameBlockTitle>{title}</GameBlockTitle>
      {children}
    </div>
  );
};

export const CardTypeSymbol = ({ cardType }: { cardType: CardType }) => {
  return (
    <>
      {cardType === CardType.PRODUCTION ? (
        <Image
          alt="PRODUCTION card type"
          src="/images/production.png"
          layout="fill"
        />
      ) : cardType === CardType.GOVERNANCE ? (
        <Image
          alt="GOVERNANCE card type"
          src="/images/governance.png"
          layout="fill"
        />
      ) : cardType === CardType.DESTINATION ? (
        <Image
          alt="DESTINATION card type"
          src="/images/destination.png"
          layout="fill"
        />
      ) : cardType === CardType.PROSPERITY ? (
        <Image
          alt="PROSPERITY card type"
          src="/images/prosperity.png"
          layout="fill"
        />
      ) : cardType === CardType.TRAVELER ? (
        <Image
          alt="TRAVELER card type"
          src="/images/traveler.png"
          layout="fill"
        />
      ) : (
        <>{cardType}</>
      )}
    </>
  );
};

export const CardIcon = () => {
  return <Image alt="Card Icon" src="/images/card.png" layout="fill" />;
};

export const AdornmentCardIcon = () => {
  return (
    <Image
      alt="Adornment Card Icon"
      src="/images/adornment_card.png"
      layout="fill"
    />
  );
};

export const WorkerSpotIcon = ({ locked = false }: { locked?: boolean }) => {
  if (locked) {
    return (
      <Image
        alt="Worker Spot (Locked)"
        src="/images/worker_spot_locked.png"
        layout="fill"
      />
    );
  } else {
    return (
      <Image alt="Worker Spot" src="/images/worker_spot.png" layout="fill" />
    );
  }
};

export const AmbassadorSpotIcon = () => {
  return (
    <Image
      alt="Ambassador Spot"
      src="/images/ambassador_spot.png"
      layout="fill"
    />
  );
};

export const EmptyCitySpotIcon = () => {
  return (
    <Image alt="Empty City Spot" src="/images/city_slot.png" layout="fill" />
  );
};

export const VPIcon = () => {
  return <Image alt="VP Token" src="/images/vp.png" layout="fill" />;
};

export const Points = ({ numPoints }: { numPoints: number }) => {
  return (
    <div className={styles.points}>
      <span>{numPoints}</span>
    </div>
  );
};

export const WildResourceIcon = () => {
  return (
    <Image alt="WILD Resource" src="/images/wild_resource.png" layout="fill" />
  );
};

export const ResourceTypeIcon = ({
  resourceType,
}: {
  resourceType: ResourceType;
}) => {
  return (
    <>
      {resourceType === ResourceType.BERRY ? (
        <Image alt="BERRY Resource" src="/images/berry.png" layout="fill" />
      ) : resourceType === ResourceType.TWIG ? (
        <Image alt="TWIG Resource" src="/images/twig.png" layout="fill" />
      ) : resourceType === ResourceType.PEBBLE ? (
        <Image alt="PEBBLE Resource" src="/images/pebble.png" layout="fill" />
      ) : resourceType === ResourceType.RESIN ? (
        <Image alt="RESIN Resource" src="/images/resin.png" layout="fill" />
      ) : resourceType === ResourceType.PEARL ? (
        <Image alt="PEARL Resource" src="/images/pearl.png" layout="fill" />
      ) : (
        <>{resourceType}</>
      )}
    </>
  );
};

export const GameIcon = ({
  type,
}: {
  type: CardType | ResourceType | "CARD" | "VP" | "ANY";
}) => {
  return (
    <div className={styles.resource}>
      <div className={styles.resource_inner}>
        {type === "CARD" ? (
          <CardIcon />
        ) : type === "VP" ? (
          <VPIcon />
        ) : type === "ANY" ? (
          <WildResourceIcon />
        ) : Object.values(ResourceType).includes(type as any) ? (
          <ResourceTypeIcon resourceType={type as ResourceType} />
        ) : Object.values(CardType).includes(type as any) ? (
          <CardTypeSymbol cardType={type as CardType} />
        ) : (
          type
        )}
      </div>
    </div>
  );
};

export const Description = ({ textParts }: { textParts: GameText }) => {
  return textParts ? (
    <span>
      {textParts.map((part: TextPart, idx: number) => {
        switch (part.type) {
          case "text":
            return part.text;
          case "em":
            return (
              <span key={idx} className={styles.em_part}>
                {part.text}
              </span>
            );
          case "BR":
            return <br key={idx} />;
          case "HR":
            return <hr key={idx} />;
          case "resource":
            return <GameIcon key={idx} type={part.resourceType} />;
          case "cardType":
            return <GameIcon key={idx} type={part.cardType} />;
          case "points":
            return <Points key={idx} numPoints={part.value} />;
          case "symbol":
            return <GameIcon key={idx} type={part.symbol} />;
          case "player":
            return (
              <span key={idx} className={styles.player_part}>
                {part.name}
              </span>
            );
          case "entity":
            if (part.entityType === "event") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={Event.fromName(part.event).getShortName()}
                  />
                </span>
              );
            }
            if (part.entityType === "location") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={Location.fromName(part.location).shortName}
                  />
                </span>
              );
            }
            if (part.entityType === "card") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={[{ type: "text", text: part.card }]}
                  />
                </span>
              );
            }
            if (part.entityType === "adornment") {
              return (
                <span key={idx} className={styles.entity_part}>
                  {part.adornment}
                </span>
              );
            }
            if (part.entityType === "riverDestination") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={[{ type: "text", text: part.riverDestination }]}
                  />
                </span>
              );
            }
            if (part.entityType === "riverDestinationSpot") {
              return (
                <span key={idx} className={styles.entity_part}>
                  <Description
                    textParts={
                      RiverDestinationSpot.fromName(part.spot).shortName
                    }
                  />
                </span>
              );
            }
            assertUnreachable(part, `Unexpected part: ${JSON.stringify(part)}`);
            break;
          default:
            assertUnreachable(part, `Unexpected part: ${JSON.stringify(part)}`);
        }
      })}
    </span>
  ) : null;
};

export const ItemWrapper: React.FC<{
  isHighlighted?: boolean;
  footerChildren?: any;
}> = ({ isHighlighted = false, footerChildren = null, children }) => {
  return (
    <div className={styles.item_wrapper}>
      <div className={isHighlighted ? styles.item_highlighted : undefined}>
        {children}
      </div>
      <div className={styles.item_footer}>{footerChildren}</div>
    </div>
  );
};

export const InfoIconSvg = () => {
  return (
    <svg fill="#000000" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M 12 0 C 5.371094 0 0 5.371094 0 12 C 0 18.628906 5.371094 24 12 24 C 18.628906 24 24 18.628906 24 12 C 24 5.371094 18.628906 0 12 0 Z M 12 2 C 17.523438 2 22 6.476563 22 12 C 22 17.523438 17.523438 22 12 22 C 6.476563 22 2 17.523438 2 12 C 2 6.476563 6.476563 2 12 2 Z M 12 5.8125 C 11.816406 5.8125 11.664063 5.808594 11.5 5.84375 C 11.335938 5.878906 11.183594 5.96875 11.0625 6.0625 C 10.941406 6.15625 10.851563 6.285156 10.78125 6.4375 C 10.710938 6.589844 10.6875 6.769531 10.6875 7 C 10.6875 7.226563 10.710938 7.40625 10.78125 7.5625 C 10.851563 7.71875 10.941406 7.84375 11.0625 7.9375 C 11.183594 8.03125 11.335938 8.085938 11.5 8.125 C 11.664063 8.164063 11.816406 8.1875 12 8.1875 C 12.179688 8.1875 12.371094 8.164063 12.53125 8.125 C 12.691406 8.085938 12.816406 8.03125 12.9375 7.9375 C 13.058594 7.84375 13.148438 7.71875 13.21875 7.5625 C 13.289063 7.410156 13.34375 7.226563 13.34375 7 C 13.34375 6.769531 13.289063 6.589844 13.21875 6.4375 C 13.148438 6.285156 13.058594 6.15625 12.9375 6.0625 C 12.816406 5.96875 12.691406 5.878906 12.53125 5.84375 C 12.371094 5.808594 12.179688 5.8125 12 5.8125 Z M 10.78125 9.15625 L 10.78125 18.125 L 13.21875 18.125 L 13.21875 9.15625 Z" />
    </svg>
  );
};
