import React, { Component } from "react";
import "./App.css";
import Room from "./Room.js";

export default class App extends Component {
  state = {
    ad: null,
    enter: null,
    Enterprise: null,
  };

  componentDidMount() {
    const enter = (
      <div id="giris">
        <div id="enter">
          <input
            onChange={this.adyazma}
            type="text"
            placeholder="Bize adını söyle!"
          ></input>
          <button type="button" onClick={this.odayagir}>
            Giriş Yap
          </button>
        </div>
      </div>
    );

    this.setState({ enter: enter });
  }

  adyazma = (e) => {
    this.setState({ ad: e.target.value });
  };

  odayagir = () => {
    const room = <Room data={{ ad: this.state.ad }} />;
    if (this.state.ad !== null) {
      this.setState({ Enterprise: room, enter: null });
    } else {
      alert("GARDAŞ! DÜZGÜNCE BİLGİLERİ GİR..");
    }
  };

  render() {
    return (
      <div id="enterprise">
        <h4 style={{ color: "white" }}>{"Adın: " + this.state.ad}</h4>
        {this.state.enter}
        {this.state.Enterprise ? this.state.Enterprise : null}
      </div>
    );
  }
}
