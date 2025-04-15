import * as React from "react";
import { useContext } from "react";
import { Formik, FormikProps } from "formik";

import {
  GameInput,
  GameInputType,
  GameOptions,
  GameInputMultiStep,
  LocationName,
  CardName,
} from "../model/types";
import { Player } from "../model/player";
import { inputContextPrefix, toGameText } from "../model/gameText";

import { GameBlock, Description } from "./common";
import { assertUnreachable } from "../utils";
import { GameUpdaterContext } from "./GameUpdater";
import { useTranslation } from "next-i18next";

type TValues = {
  gameInput: GameInput | null;
};

export const GameInputBoxContainer: React.FC<{
  title: string;
  gameId: string;
  viewingPlayer: Pick<Player, "playerId" | "playerSecretUNSAFE">;
  devDebug?: boolean;
  initialValues: TValues;
  children: (props: FormikProps<TValues>) => React.ReactNode;
}> = ({
  gameId,
  title,
  initialValues,
  viewingPlayer,
  children,
  devDebug = false,
}) => {
  const updateGameState = useContext(GameUpdaterContext);
  return (
    <GameBlock id={"js-game-input-box-form"} title={title}>
      <Formik
        enableReinitialize={true}
        initialValues={initialValues}
        onSubmit={async (values, bag) => {
          const response = await fetch("/api/game-action", {
            method: "POST",
            cache: "no-cache",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gameId,
              playerId: viewingPlayer.playerId,
              playerSecret: viewingPlayer.playerSecretUNSAFE,
              gameInput: values.gameInput,
            }),
          });
          const json = await response.json();
          if (!json.success) {
            alert(json.error);
          } else if (devDebug) {
            window.location.reload();
          } else {
            updateGameState();
          }
        }}
      >
        {children}
      </Formik>
    </GameBlock>
  );
};

const renderMultiStepGameInputLabel = (
  gameInput: GameInputMultiStep
): React.ReactElement => {
  if (gameInput.label) {
    return (
      <Description
        textParts={[
          ...inputContextPrefix(gameInput),
          ...toGameText(gameInput.label),
        ]}
      />
    );
  }

  switch (gameInput.inputType) {
    case GameInputType.DISCARD_CARDS:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            {
              type: "text",
              text: `Discard${gameInput.minCards === 0 ? " up to" : ""} ${
                gameInput.maxCards
              } `,
            },
            { type: "symbol", symbol: "CARD" },
          ]}
        />
      );
    case GameInputType.SELECT_PLAYER:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Select Player` },
          ]}
        />
      );
    case GameInputType.SELECT_LOCATION:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Select Location` },
          ]}
        />
      );
    case GameInputType.SELECT_RESOURCES:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            {
              type: "text",
              text: `Select${gameInput.minResources === 0 ? " up to" : ""} ${
                gameInput.maxResources
              } `,
            },
            gameInput.specificResource
              ? { type: "resource", resourceType: gameInput.specificResource }
              : !gameInput.excludeResource
              ? { type: "resource", resourceType: "ANY" }
              : {
                  type: "text",
                  text: `resource${gameInput.maxResources > 1 ? "s" : ""}`,
                },
            gameInput.toSpend
              ? { type: "text", text: " to spend" }
              : { type: "text", text: " to gain" },
          ]}
        />
      );
    case GameInputType.SELECT_PAYMENT_FOR_CARD:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Play ` },
            { type: "entity", entityType: "card", card: gameInput.card },

            {
              type: "text",
              text:
                gameInput.locationContext ===
                LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
                  ? " for 1 less "
                  : gameInput.cardContext === CardName.INN
                  ? " for 3 less "
                  : "",
            },
            { type: "resource", resourceType: `ANY` },
          ]}
        />
      );
    case GameInputType.SELECT_OPTION_GENERIC:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: "Choose an Option" },
          ]}
        />
      );
    case GameInputType.SELECT_WORKER_PLACEMENT:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Select a Worker` },
          ]}
        />
      );
    case GameInputType.SELECT_PLAYED_CARDS:
    case GameInputType.SELECT_CARDS_WITH_SOURCE:
    case GameInputType.SELECT_CARDS:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            {
              type: "text",
              text: `Select${gameInput.minToSelect === 0 ? " up to" : ""} ${
                gameInput.maxToSelect
              } `,
            },
            { type: "symbol", symbol: "CARD" },
          ]}
        />
      );
    case GameInputType.SELECT_PLAYED_ADORNMENT:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Select Adornment` },
          ]}
        />
      );
    case GameInputType.SELECT_RIVER_DESTINATION:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Select River Destination` },
          ]}
        />
      );
    case GameInputType.SELECT_TRAIN_CAR_TILE:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Select Train Car Tile` },
          ]}
        />
      );
    case GameInputType.SELECT_VISITOR:
      return (
        <Description
          textParts={[
            ...inputContextPrefix(gameInput),
            { type: "text", text: `Select Visitor to Discard` },
          ]}
        />
      );
    default:
      assertUnreachable(gameInput, gameInput);
  }
  return <></>;
};

export const renderGameInputLabel = (
  gameInput: GameInput,
  gameOptions: Pick<GameOptions, "pearlbrook"> = { pearlbrook: false }
): React.ReactElement => {
  const { t } = useTranslation("common");
  switch (gameInput.inputType) {
    case GameInputType.PLAY_CARD:
      return <span>{t("Play Card")}</span>;
    case GameInputType.PLACE_WORKER:
      return <span>{t("Visit Location")}</span>;
    case GameInputType.VISIT_DESTINATION_CARD:
      return <span>{t("Visit Destination Card")}</span>;
    case GameInputType.CLAIM_EVENT:
      return (
        <span>
          {gameOptions?.pearlbrook ? t("Claim Event / Wonders") : t("Claim Event")}
        </span>
      );
    case GameInputType.PREPARE_FOR_SEASON:
      return <span>{t("Prepare for Season")}</span>;
    case GameInputType.GAME_END:
      return <span>{t("End Game")}</span>;
    case GameInputType.PLAY_ADORNMENT:
      return <span>{t("Play Adornment")}</span>;
    case GameInputType.PLACE_AMBASSADOR:
      return <span>{t("Place Ambassador")}</span>;
    case GameInputType.RESERVE_CARD:
      return <span>{t("Reserve Meadow/Station Card")}</span>;
    case GameInputType.PLAY_TRAIN_TICKET:
      return <span>{t("Play Train Ticket")}</span>;
    case GameInputType.SELECT_VISITOR:
      return (
        <span>
          {gameInput.prevInputType === GameInputType.PLACE_WORKER
            ? t("Select Visitor to discard")
            : t("Select Visitor to keep")}
        </span>
      );
    case GameInputType.UNDO:
      return <span>{t("Undo last action")}</span>;
    default:
      return renderMultiStepGameInputLabel(gameInput);
  }
};
