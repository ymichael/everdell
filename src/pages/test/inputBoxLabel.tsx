import { GetServerSideProps } from "next";

import { GameInputMultiStep } from "../../model/types";
import { renderGameInputLabel } from "../../components/gameInputCommon";
import pendingGameInputsJSON from "./pendingGameInputs.json";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      pendingGameInputsJSON,
    },
  };
};

export default function TestGamePendingInputsPage(props: {
  pendingGameInputsJSON: GameInputMultiStep[];
}) {
  return props.pendingGameInputsJSON.map(
    (gameInput: GameInputMultiStep, idx: number) => {
      return (
        <div style={{ padding: "5px" }} key={idx}>
          {renderGameInputLabel(gameInput)}
        </div>
      );
    }
  );
}
