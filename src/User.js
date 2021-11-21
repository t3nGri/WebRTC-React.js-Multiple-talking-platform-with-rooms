import React, { Component } from "react";

export default class User extends Component {
    constructor(props) {
        super(props);
        this.state = {
          mic:null
        }
       
        this.userRef = React.createRef();
      }
      componentDidMount(){
        this.userRef.current.srcObject = this.props.audio.stream
        console.log(this.props.audio)
        const audio = document.getElementById(`${this.props.audio.id}`)
        audio.volume = 50/100
      }

      componentDidUpdate(prevProps){
        this.userRef.current.srcObject = prevProps.audio.stream
      }
      volume = (e) => {
        const audio = document.getElementById(`${this.props.audio.id}`)
        audio.volume = e.target.value/100
      }
    
  render() {
    return (
      <div id="users">
          <h3 class="ad">{this.props.audio.ad}</h3>
          <audio
            id={`${this.props.audio.id}`}
            hidden
            class="audio"
            ref={this.userRef}
            autoPlay
            controls
            key={this.props.audio.id}
          ></audio>
          <div id={`${this.props.mic}`}></div>
          <input onChange={this.volume} type="range" min="1" max="100" />
      </div>
    );
  }
}

