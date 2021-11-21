import React, { Component } from "react";
import io from "socket.io-client";
import User from "./User";

export default class Room extends Component {
  constructor(props) {
    super(props);

    this.state = {
      createRoom: null,
      socket: false,
      oda: null,
      odalar: [],
      girilmisOda: null,
      odaAdı: null,
      localAudio: null,
      remoteAudio: null,
      remoteAudios: [],
      mic_Statuses: [],
      peerConnections: {},
      candidates: [],
      status: "Başka kullanıcıların gelemesini bekleyin...",
      mic_status: true,
    };
    this.socket = null;
    this.serverIP = "/rooms";

    this.pc_config = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };

    this.sdpConstraints = {
      OfferToReceiveAudio: true,
    };
    this.localAudioref = React.createRef();
  }

  mute = async () => {
    if (this.state.mic_status) {
      this.state.localAudio.getAudioTracks()[0].enabled = !this.state
        .mic_status;
      await this.setState({ mic_status: false });
    } else {
      this.state.localAudio.getAudioTracks()[0].enabled = !this.state
        .mic_status;
      await this.setState({ mic_status: true });
    }
    this.socket.emit("mic", {
      mic: this.state.mic_status,
      id: this.socket.id,
      ad: this.props.data.ad,
    });
  };

  micSwitch = () => {
    this.mute();
  };

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  socketiCalistir = () => {
    this.socket = io.connect(this.serverIP, {
      auth: {
        room: this.state.odaAdı,
      },
    });
    this.setState({ girilmisOda: this.state.odaAdı });
    console.log("BAĞLANMAYA ÇALIŞIYORUZ +", this.socket);

    this.socket.on("connection-success", (data) => {
      console.log("Socket'e bağlandık : " + data.success);
      this.getmyAudio();
    });

    this.socket.on("online-peer", (socketID) => {
      console.log(
        socketID.socketID + "-" + socketID.ad + "- Id'li kullanıcı Ağda"
      );

      const newmicStatus = {
        ...this.state.mic_Statuses,
        [socketID.socketID]: socketID.mic_status,
      };
      this.setState({ mic_Statuses: newmicStatus });

      this.createPeerConnection(socketID, (pc) => {
        if (pc)
          pc.createOffer(this.sdpConstraints).then((sdp) => {
            console.log(sdp);
            pc.setLocalDescription(sdp);
            this.sendToPeer("offer", sdp, {
              receiver: socketID.socketID,
              sender: this.socket.id,
              sender_mic: this.state.mic_status,
            });
          });
      });
    });
    ///İLK//////////

    ///ikinci-------------
    this.socket.on("offer", (data) => {
      console.log("offer geldi amq " + data.offerSender + " " + data.senderAd);

      const newmicStatus = {
        ...this.state.mic_Statuses,
        [data.offerSender]: data.senderMic,
      };
      this.setState({ mic_Statuses: newmicStatus });

      this.createPeerConnection(
        { socketID: data.offerSender, ad: data.senderAd },
        (pc) => {
          pc.setRemoteDescription(data.sdp) //RTCSessionDescription silip denenecek
            .then(() => {
              pc.createAnswer(this.sdpConstraints).then((sdp) => {
                pc.setLocalDescription(sdp);
                this.sendToPeer("answer", sdp, {
                  receiver: data.offerSender,
                  answerSender: this.socket.id,
                });
              });
            });
        }
      );
    });
    ///ikinci-------------

    //ilk
    this.socket.on("answer", (data) => {
      console.log("answer-client");
      const pc = this.state.peerConnections[data.answerSender];

      pc.setRemoteDescription(data.sdp);
    });

    this.socket.on("candidate", (data) => {
      console.log("addIceCandidate");
      const pc = this.state.peerConnections[data.socketID];
      console.log(data.sdp);

      if (pc)
        pc.addIceCandidate(data.sdp)
          .then(() => console.log("addIceCandidate Başarılı"))
          .catch((e) => console.log("HATA VAR AMK - ADD ICE CANDIDATE " + e));
    });

    this.socket.on("disconnected", (data) => {
      console.log("disconnected");
      const remoteAudios = this.state.remoteAudios.filter(
        (stream) => stream.id !== data
      );
      console.log(remoteAudios);
      this.setState({ remoteAudios });
    });

    this.socket.on("mic", (data) => {
      console.log(data.mic);
      const newmicStatus = {
        ...this.state.mic_Statuses,
        [data.id]: data.mic,
      };
      this.setState({ mic_Statuses: newmicStatus });
    });
  };
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  getmyAudio = () => {
    const constraints = { audio: true };

    const success = (stream) => {
      this.setState({ localAudio: stream });

      if (this.state.localAudio) {
        this.localAudioref.current.srcObject = stream;
        console.log("MİKRAFONDAN ALINAN VERİ");
        console.log(stream);
      }

      this.scanUsers();
    };
    const fail = (e) => {
      console.log("Error while getting local Audio " + e);
    };

    navigator.mediaDevices.getUserMedia(constraints).then(success).catch(fail);
  };
  //SCAN USERSSS////////////////////////////////////////////////////SCAN USERS
  scanUsers = () => {
    console.log("scanUsers");
    this.sendToPeer("onlineUsers", null, {
      socketID: this.socket.id,
      ad: this.props.data.ad,
      mic_status: this.state.mic_status,
    });
  };
  //SENDTOPEER////////////////////////////////////////////////
  sendToPeer = (dataType, sdp, socketID) => {
    this.socket.emit(dataType, { sdp, socketID });
    console.log("sendToPeer - " + dataType);
  };

  /////CREATE-CONNECTİON////////////////////////////////CREATE-CONNECTİON//////////////////
  createPeerConnection = (socketID, callback) => {
    try {
      let pc = new RTCPeerConnection(this.pc_config);

      // add pc to peerConnections object
      const peerConnections = {
        ...this.state.peerConnections,
        [socketID.socketID]: pc,
      };
      this.setState({ peerConnections: peerConnections });

      pc.onicecandidate = (e) => {
        const candidates = [];
        candidates.push(e.candidate);
        if (candidates[0]) {
          this.sendToPeer("candidate", candidates[0], {
            candidateReceiver: socketID.socketID,
            candidateSender: this.socket.id,
          });
        }
      };

      pc.ontrack = (e) => {
        const remoteAudio = {
          id: socketID.socketID,
          ad: socketID.ad,
          stream: e.streams[0],
        };
        const newremoteAudios = [...this.state.remoteAudios, remoteAudio];
        this.setState({ remoteAudios: newremoteAudios });
      };

      if (this.state.localAudio)
        this.state.localAudio.getTracks().forEach((track) => {
          pc.addTrack(track, this.state.localAudio);
        });

      callback(pc);
    } catch (e) {
      console.log("HATA VAR AMK - PC OLUŞTURULAMADI!!", e);
      // return;
    }
  };

  ///////DİDMOUNT///////////////////////////////////////////////////////DİDMOUNT&&&&&&&&&&&&&&&&&&&&&&&&&
  componentDidMount() {
    this.socketEnter = io.connect("/enter");

    const createRoom = (
      <div id="roomName">
        <input
          onChange={this.odayazma}
          type="text"
          placeholder="Oda adı gir"
        ></input>
        <button type="button" onClick={this.odayagir}>
          Oda bul
        </button>
      </div>
    );

    this.setState({ createRoom: createRoom });

    this.socketEnter.on("rooms", (veri) => {
      this.setState({ odalar: veri });
    });
  }

  odayazma = (e) => {
    this.setState({ odaAdı: e.target.value.toLowerCase() });
  };

  odayagir = () => {
    if (this.state.girilmisOda !== this.state.odaAdı) {
      this.setState({ remoteAudios: [] });
      if (this.socket) {
        this.socket.disconnect();
      }
      this.socketiCalistir();
    }
  };

  odaDegistir = async (e) => {
    if (
      e.target.firstChild.className === "odaAdı" ||
      e.target.className === "odaAdı"
    ) {
      await this.setState({ odaAdı: e.target.firstChild.textContent });
      this.odayagir();
    } else {
      await this.setState({
        odaAdı: e.target.previousElementSibling.textContent,
      });
      this.odayagir();
    }
  };

  /////////////////////RENDER////////////////////////////////////////////&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
  render() {
    return (
      <div id="ana">
        {this.state.girilmisOda ? this.state.girilmisOda : null}
        {this.state.createRoom ? this.state.createRoom : null}
        <div id="scope">
          <div class="doukan">
            <h2 class="ad">{this.props.data.ad}</h2>
            <audio
              hidden
              ref={this.localAudioref}
              autoPlay
              controls
              muted
            ></audio>
            <div
              id={`local_${this.state.mic_status}`}
              onClick={this.micSwitch}
            ></div>
          </div>
          <div id="room">
            {this.state.remoteAudios.map((audio) => (
              <div class="user">
                <User audio={audio} mic={this.state.mic_Statuses[audio.id]} />
              </div>
            ))}
          </div>
        </div>
        {this.state.oda ? this.state.oda : null}
        <div id="digerOdalar">
          {this.state.odalar.map((oda) => (
            <div className="digerOda" onClick={this.odaDegistir}>
                <h4 className="odaAdı" style={{ color: "white" }}>
                  {oda.ad}
                </h4>
                <h5 className="odaSayısı" style={{ color: "white" }}>
                  {oda.boyut} Kişi
                </h5>
            </div>
          ))}
        </div>
      </div>
    );
  }
}