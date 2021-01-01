import Image from "next/image";
import { CardType, ResourceType } from "../model/types";

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
