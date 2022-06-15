import * as React from "react";
import { useRouter } from "next/router";
import { Formik, Form, Field, FieldArray } from "formik";
import styles from "../styles/Home.module.css";

let playerIdx = 0;
const getDummyPlayer = (name = "") => {
  playerIdx++;
  return {
    name: name || `Player ${playerIdx}`,
  };
};

const GameBuilder: React.FC = () => {
  const router = useRouter();
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
                        <h2>New Game</h2>
                        <h3>Players</h3>
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
                          <h3>Expansions</h3>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="pearlbrook" />
                            {"Pearlbrook"}
                          </label>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="legends" />
                            {"Legends"}
                          </label>
                        </div>
                        <div>
                          <h3>Settings</h3>
                          <label className={styles.game_builder_option}>
                            <Field
                              type="checkbox"
                              name="randomizeStartingPlayer"
                            />
                            {"Randomize player order"}
                          </label>
                          <label className={styles.game_builder_option}>
                            <Field type="checkbox" name="realtimePoints" />
                            {"Show points in realtime"}
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
                  Start Game
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
