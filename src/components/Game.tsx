import * as React from "react";
import { connect } from "react-redux";

class Game extends React.Component {
  render() {
    return <pre>{JSON.stringify(this.props, null, 2)}</pre>;
  }
}

export default connect((state) => state)(Game);
