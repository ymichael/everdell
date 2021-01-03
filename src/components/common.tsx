import * as React from "react";
import Image from "next/image";

import styles from "../styles/common.module.css";
import { ResourceType, CardType } from "../model/types";

export const GameBlockTitle: React.FC = ({ children }) => {
  return <div className={styles.title}>{children}</div>;
};

export const GameBlock: React.FC<{ title: string }> = ({ title, children }) => {
  return (
    <div className={styles.block}>
      <GameBlockTitle>{title}</GameBlockTitle>
      {children}
    </div>
  );
};

export const CardTypeSymbol = ({ cardType }: { cardType: CardType }) => {
  return (
    <>
      {cardType === CardType.PRODUCTION ? (
        <Image src="/images/production.png" layout="fill" />
      ) : cardType === CardType.GOVERNANCE ? (
        <Image src="/images/governance.png" layout="fill" />
      ) : cardType === CardType.DESTINATION ? (
        <Image src="/images/destination.png" layout="fill" />
      ) : cardType === CardType.PROSPERITY ? (
        <Image src="/images/prosperity.png" layout="fill" />
      ) : cardType === CardType.TRAVELER ? (
        <Image src="/images/traveler.png" layout="fill" />
      ) : (
        <>{cardType}</>
      )}
    </>
  );
};

export const CardIcon = () => {
  return <Image src="/images/card.png" layout="fill" />;
};

export const VPIcon = () => {
  return <Image src="/images/vp.png" layout="fill" />;
};

export const WildResourceIcon = () => {
  return <Image src="/images/wild_resource.png" layout="fill" />;
};

export const ResourceTypeIcon = ({
  resourceType,
}: {
  resourceType: ResourceType;
}) => {
  return (
    <>
      {resourceType === ResourceType.BERRY ? (
        <Image src="/images/berry.png" layout="fill" />
      ) : resourceType === ResourceType.TWIG ? (
        <Image src="/images/twig.png" layout="fill" />
      ) : resourceType === ResourceType.PEBBLE ? (
        <Image src="/images/pebble.png" layout="fill" />
      ) : resourceType === ResourceType.RESIN ? (
        <Image src="/images/resin.png" layout="fill" />
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

const ICON_TYPES: Record<any, any> = {
  ...ResourceType,
  ...CardType,
  CARD: "CARD",
  VP: "VP",
  ANY: "ANY",
};

const cardTypeList = [];

export const Description = ({ description }: { description: string[] }) => {
  return description ? (
    <span>
      {description.map((part: any, idx: number) => {
        if (ICON_TYPES[part]) {
          return <GameIcon key={idx} type={part} />;
        } else {
          return part;
        }
      })}
    </span>
  ) : null;
};
