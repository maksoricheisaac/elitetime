import { createServer } from "http";
import { Server, type Socket } from "socket.io";

interface LateAlertPayload {
  userId: string;
  userName: string;
  timestamp: string;
}

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket) => {
  console.log("Client connected", socket.id);

  socket.on("employee_late_alert", (payload: LateAlertPayload) => {
    io.emit("employee_late_alert", payload);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

const PORT = Number(process.env.SOCKET_PORT || 4000);

httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
