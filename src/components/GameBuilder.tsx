import * as React from "react";
import { Formik, Form, Field, FieldArray } from "formik";

const GameBuilder: React.FC = () => {
  let playerIdx = 0;
  const getDummyPlayer = (name: string = "") => {
    playerIdx++;
    return {
      name: name || `Player ${playerIdx}`,
      critter: "",
    };
  };

  return (
    <>
      <h1>Create Game</h1>
      <Formik
        initialValues={{
          players: [getDummyPlayer("Player 1"), getDummyPlayer("Player 2")],
        }}
        render={({ values }) => {
          const players = values.players || [];
          const numPlayers = players.length;
          return (
            <Form>
              <FieldArray
                name="players"
                render={(arrayHelpers) => (
                  <div>
                    <h2>Players</h2>
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
                  </div>
                )}
              />
              <p>
                <button type="submit">Submit</button>
              </p>
            </Form>
          );
        }}
        onSubmit={(values, actions) => {
          console.log({ values, actions });
          alert(JSON.stringify(values, null, 2));
          actions.setSubmitting(false);
        }}
      />
    </>
  );
};

export default GameBuilder;
