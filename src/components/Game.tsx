import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { IGame } from "../model/types";

import { StoreState } from "../redux/store";
import { PageType } from "../redux/pageType";

class Game extends React.Component<{
  activeGame: IGame | null;
  pageType: PageType;
  dispatch: Dispatch;
}> {
  private newGame = () => {
    this.props.dispatch({
      type: "NEW_GAME",
    });
  };

  private createGame = () => {
    this.props.dispatch({
      type: "CREATE_GAME",
      playerNames: ["player one", "player two"],
    });
  };

  render() {
    if (this.props.pageType == PageType.GAME_BUILDER) {
      return (
        <>
          <div>Create Game</div>
          <p>TODO: form here</p>
          <button onClick={this.createGame}>create game</button>
        </>
      );
    } else if (this.props.pageType == PageType.GAME) {
      return <pre>{JSON.stringify(this.props, null, 2)}</pre>;
    } else {
      return (
        <>
          <div>No active game</div>
          <button onClick={this.newGame}>new game</button>
        </>
      );
    }
  }
}

export default connect((state: StoreState) => ({
  pageType: state.pageType,
  activeGame: state.activeGame,
}))(Game);
