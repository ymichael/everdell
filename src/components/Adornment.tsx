import * as React from "react";

import styles from "../styles/Adornment.module.css";

import { Adornment as AdornmentModel } from "../model/adornment";
import { AdornmentName, ResourceType } from "../model/types";

import { Description, ItemWrapper } from "./common";

export const Adornment = ({ name }: { name: AdornmentName }) => {
  const adornment = AdornmentModel.fromName(name);
  return (
    <ItemWrapper>
      <div className={styles.adornment}>
        <div>
          <div className={styles.adornment_header}>{adornment.name}</div>
          <div className={styles.adornment_cost_row}>
            <Description
              textParts={[
                { type: "text", text: "1 " },
                { type: "resource", resourceType: ResourceType.PEARL },
              ]}
            />
          </div>
        </div>
        <div className={styles.adornment_description}>
          <Description textParts={adornment.description} />
          {adornment.baseVP !== 0 && (
            <div className={styles.base_vp}>
              <Description
                textParts={[
                  { type: "HR" },
                  { type: "text", text: "3" },
                  { type: "symbol", symbol: "VP" },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </ItemWrapper>
  );
};

export default Adornment;
