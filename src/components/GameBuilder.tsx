import * as React from "react";
import { useRouter } from "next/router";
import { Formik, Form, Field, FieldArray } from "formik";
import { GameBlock } from "./common";

let playerIdx = 0;
const getDummyPlayer = (name: string = "") => {
  playerIdx++;
  return {
    name: name || `Player ${playerIdx}`,
    critter: "",
  };
};

const GameBuilder: React.FC = () => {
  const router = useRouter();

  return (
    <GameBlock title={"Create Game"}>
      <Formik
        initialValues={{
          players: [getDummyPlayer("Player 1"), getDummyPlayer("Player 2")],
          randomizeStartingPlayer: false,
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
              <FieldArray
                name="players"
                render={(arrayHelpers) => (
                  <div>
                    <p>Players</p>
                    {numPlayers > 0 ? (
                      players.map((player, idx) => (
                        <div key={idx}>
                          <Field
                            name={`players.${idx}.name`}
                            placeholder="Player Name"
                          />
                          <Field
                            name={`players.${idx}.critter`}
                            placeholder="Player Critter"
                          />
                          {numPlayers > 2 && (
                            <button
                              type="button"
                              onClick={() => arrayHelpers.remove(idx)}
                            >
                              {" "}
                              -{" "}
                            </button>
                          )}
                          {numPlayers <= 6 && (
                            <button
                              type="button"
                              onClick={() =>
                                arrayHelpers.insert(idx + 1, getDummyPlayer())
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
                    <label>
                      <Field type="checkbox" name="randomizeStartingPlayer" />
                      {"Randomize starting player"}
                    </label>
                  </div>
                )}
              />
              <p>
                <button type="submit">Submit</button>
              </p>
            </Form>
          );
        }}
      </Formik>
    </GameBlock>
  );
};

export default GameBuilder;
