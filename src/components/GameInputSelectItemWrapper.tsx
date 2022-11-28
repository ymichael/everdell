import * as React from "react";
import { useRef } from "react";
import { useField } from "formik";
import isEqual from "lodash/isEqual";

import styles from "../styles/gameBoard.module.css";

import { ItemWrapper } from "./common";

function GameInputSelectItemWrapper<T = any>({
  name,
  items,
  renderItem,
  chooseOne,
  valueOnSelect,
}: {
  name: string;
  items: T[];
  renderItem: (t: T) => JSX.Element;
  chooseOne: boolean;
  valueOnSelect?: (t: T) => any;
}) {
  const [_field, meta, helpers] = useField(name);
  const selectedIdxMap = useRef<any>({});
  return (
    <div className={styles.items}>
      {items.map((item, idx) => {
        const isSelected = chooseOne
          ? isEqual(meta.value, valueOnSelect ? valueOnSelect(item) : item)
          : !!selectedIdxMap.current[idx];
        return (
          <div
            className={styles.clickable}
            key={idx}
            onClick={() => {
              if (chooseOne) {
                if (isSelected) {
                  helpers.setValue(null);
                } else if (valueOnSelect) {
                  helpers.setValue(valueOnSelect(item));
                } else {
                  helpers.setValue(item);
                }
              } else {
                if (isSelected) {
                  const newValue = [...meta.value];
                  newValue.splice(newValue.indexOf(item), 1);
                  helpers.setValue(newValue);
                  selectedIdxMap.current[idx] = false;
                } else {
                  helpers.setValue(meta.value.concat([item]));
                  selectedIdxMap.current[idx] = true;
                }
              }
            }}
          >
            <ItemWrapper isHighlighted={isSelected}>
              {renderItem(item)}
            </ItemWrapper>
          </div>
        );
      })}
    </div>
  );
}

export default GameInputSelectItemWrapper;
