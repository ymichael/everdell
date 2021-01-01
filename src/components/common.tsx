import * as React from "react";
import styles from "../styles/common.module.css";
import { ResourceType } from "../model/types";
import { CardIcon, VPIcon, WildResourceIcon, ResourceTypeIcon } from "./assets";

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

export const Resource = ({
  resourceType,
}: {
  resourceType: ResourceType | "CARD" | "VP" | "ANY";
}) => {
  return (
    <div className={styles.resource}>
      <div className={styles.resource_inner}>
        {resourceType === "CARD" ? (
          <CardIcon />
        ) : resourceType === "VP" ? (
          <VPIcon />
        ) : resourceType === "ANY" ? (
          <WildResourceIcon />
        ) : (
          <ResourceTypeIcon resourceType={resourceType} />
        )}
      </div>
    </div>
  );
};

const resourceTypeList = [
  ResourceType.BERRY,
  ResourceType.TWIG,
  ResourceType.PEBBLE,
  ResourceType.RESIN,
  "CARD" as const,
  "VP" as const,
  "ANY" as const,
];

export const Description = ({ description }: { description: string[] }) => {
  return description ? (
    <span>
      {description.map((part: any, idx: number) => {
        if (resourceTypeList.indexOf(part) !== -1) {
          return <Resource key={idx} resourceType={part} />;
        } else {
          return part;
        }
      })}
    </span>
  ) : null;
};
