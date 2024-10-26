import * as React from "react";
import { useRouter } from "next/router";
import { Formik, Form, Field, FieldArray } from "formik";
import styles from "../styles/Home.module.css";
import { useTranslation } from "next-i18next";

let playerIdx = 0;
const getDummyPlayer = (name = "") => {
  playerIdx++;
  return {
    name: name || `Player ${playerIdx}`,
  };
};

const GameBuilder: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation("common");

  return (
    <div id={"js-game-builder"}>
      <Formik
        initialValues={{
          players: [getDummyPlayer("Player 1"), getDummyPlayer("Player 2")],
          randomizeStartingPlayer: true,
          realtimePoints: true,
          pearlbrook: false,
        }}
        onSubmit={async (values, actions) => {
          const response = await fetch("/api/create-game", {
            method: "POST",
            cache: "no-cache",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });
          const json = await response.json();
          if (json.success && json.gameUrl) {
            router.push(json.gameUrl);
          } else {
            alert(json.error);
          }
          actions.setSubmitting(false);
        }}
      >
        {({ values }) => {
          const players = values.players || [];
          const numPlayers = players.length;
          return (
            <Form>
              <div className={styles.game_builder}>
                <div className={styles.game_builder_fields}>
                  <FieldArray
                    name="players"
                    render={(arrayHelpers) => (
                      <div className={styles.game_builder_wrapper}>
                        <h2>{t("New Game")}</h2>
                        <h3>{t("Players")}</h3>
                        {numPlayers > 0 ? (
                          players.map((player, idx) => (
                            <div
                              key={idx}
                              className={
                                styles.game_builder_player_input_wrapper
                              }
                            >
                              <Field
                                name={`players.${idx}.name`}
                                placeholder="Player Name"
                                onClick={(e: any) => {
                                  e.target.select();
                                }}
                              />
                              {numPlayers > 2 && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  className={
                                    styles.game_builder_player_input_button
                                  }
                                  onClick={() => arrayHelpers.remove(idx)}
                                >
                                  {" "}
                                  -{" "}
                                </button>
                              )}
                              {numPlayers < 4 && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  className={[
                                    styles.game_builder_player_input_button,
                                    styles.game_builder_player_input_button_plus,
                                  ].join(" ")}
                                  onClick={() =>
                                    arrayHelpers.insert(
                                      idx + 1,
                                      getDummyPlayer()
                                    )
                                  }
                                >
                                  +
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <></>
                        )}
                        <div>
                          <h3>{t("Expansions")}</h3>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="pearlbrook" />
                            {"Pearlbrook"}
                          </label>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="newleaf" />
                            {"Newleaf"}
                            &nbsp;
                            <span className={styles.beta}>beta</span>
                          </label>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="bellfaire" />
                            {"Bellfaire"}
                            &nbsp;
                            <span className={styles.beta}>beta</span>
                          </label>
                        </div>
                        <div>
                          <h3>{t("Settings")}</h3>
                          <label className={styles.game_builder_option}>
                            <Field
                              type="checkbox"
                              name="randomizeStartingPlayer"
                            />
                            {t("Randomize player order")}
                          </label>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="realtimePoints" />
                            {t("Show points in realtime")}
                          </label>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="allowUndo" />
                            {t("Allow undo")}
                            &nbsp;
                            <span className={styles.beta}>beta</span>
                          </label>
                        </div>
                      </div>
                    )}
                  />
                </div>
                <button
                  id={"js-game-builder-submit"}
                  className={styles.button}
                  type="submit"
                >
                  {t("Start Game")}
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default GameBuilder;
