const express = require("express");
const app = express();

var io = require("socket.io")(4001);

const port = 8080;

const server = app.listen(port, () => {
  console.log(`Sunucu ${port}. port'ta çalışıyor...`);
});

app.use(express.static(__dirname + "/build"));
app.get("/", (req, res, next) => {
  res.sendFile(__dirname + "/build/index.html");
});

io.listen(server);

// io.on("connection", (socket) => {
//   console.log("Someone connected +" + socket.id);

//   socket.on("disconnect", () => {
//     console.log(`${socket.id}- ID user disconnected`);
//   });
// });

const enter = io.of("/enter");
enter.on("connection", (socket) => {
  console.log("Someone connected +" + socket.id);

  roomE()
  function roomE() {
    let yeniOdalar = [];
    for (const x in odalar) {
      yeniOdalar = [...yeniOdalar, { ad: x, boyut: odalar[x].size }];
    }
    enter.emit("rooms", yeniOdalar);
  }

  socket.on("disconnect", () => {
    console.log(`${socket.id}- ID user disconnected`);
  });
});


const peers = io.of("/rooms");

let odalar = {};

//*************************************************************************************************
peers.on("connection", (socket) => {
  const odaAdı = socket.handshake.auth.room;

  if (odalar[odaAdı]) {
    odalar[odaAdı].set(socket.id, socket);
    roomF();
  } else {
    odalar[odaAdı] = new Map().set(socket.id, socket);
    roomF();
  }

  function roomF() {
    let yeniOdalar = [];
    for (const x in odalar) {
      yeniOdalar = [...yeniOdalar, { ad: x, boyut: odalar[x].size }];
    }
    enter.emit("rooms", yeniOdalar);
  }

  console.log("Someone connected ------" + socket.id);

  socket.on("onlineUsers", async (data) => {
    await odalar[odaAdı].set(data.socketID.socketID, {
      ad: data.socketID.ad,
      socket: socket,
      mic_status: data.socketID.mic_status,
      room: data.socketID.room,
    });

    for (const [socketID, _socket] of odalar[odaAdı].entries()) {
      if (socketID !== data.socketID.socketID) {
        console.log("DÖNEN : " + socketID);
        socket.emit("online-peer", {
          socketID: socketID,
          ad: _socket.ad,
          mic_status: _socket.mic_status,
        });
      }
    }
  });

  socket.on("mic", (data) => {
    odalar[odaAdı].set(data.id, {
      ad: data.ad,
      socket: socket,
      mic_status: data.mic,
    });
    for (const [socketID, _socket] of odalar[odaAdı].entries()) {
      _socket.socket.emit("mic", { mic: data.mic, id: data.id });
    }
    console.log(data.mic);
    console.log("mic değiştirildi");
  });

  socket.on("disconnect", async () => {
    console.log("disconnected -" + socket.id);
    await odalar[odaAdı].delete(socket.id);
    for (const [socketID, _socket] of odalar[odaAdı].entries()) {
      _socket.socket.emit("disconnected", socket.id);
    }
    if (odalar[odaAdı].size === 0) {
        delete odalar[odaAdı]
        roomF()
    } else{
      roomF()
    }
  });

  socket.emit("connection-success", {
    success: socket.id,
  });

  socket.on("offer", (data) => {
    console.log("offerin içindeyiz");
    for (const [socketID, socket] of odalar[odaAdı].entries()) {
      console.log(
        socketID,
        socket.ad + " yollanması gereken : " + data.socketID.receiver
      );
      if (socketID === data.socketID.receiver) {
        for (const [socketID, socketYollayan] of odalar[odaAdı].entries()) {
          if (socketID === data.socketID.sender) {
            socket.socket.emit("offer", {
              sdp: data.sdp,
              offerSender: data.socketID.sender,
              senderAd: socketYollayan.ad,
              senderMic: data.socketID.sender_mic,
            });
          }
        }
      }
    }
  });

  socket.on("answer", (data) => {
    console.log("answer-server");
    for (const [socketID, socket] of odalar[odaAdı].entries()) {
      if (socketID === data.socketID.receiver) {
        socket.socket.emit("answer", {
          sdp: data.sdp,
          answerSender: data.socketID.answerSender,
        });
      }
    }
  });

  socket.on("candidate", (data) => {
    for (const [socketID, socket] of odalar[odaAdı].entries()) {
      if (socketID === data.socketID.candidateReceiver) {
        socket.socket.emit("candidate", {
          sdp: data.sdp,
          socketID: data.socketID.candidateSender,
        });
      }
    }
  });
});
