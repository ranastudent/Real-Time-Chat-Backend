import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ Client1 connected:", socket.id);

  // Join chat room
  socket.emit("join_chat", { chatId: "room1" });

  // Send a test message after 2s
  setTimeout(() => {
    socket.emit("send_message", {
      chatId: "room1",
      content: "Hello from Client1 👋",
      sender: "Client1",
    });
  }, 2000);
});

socket.on("system", (msg: any) => {
  console.log("📢 Client1 System:", msg);
});

socket.on("message", (msg: any) => {
  console.log("💬 Client1 got:", msg);
});

socket.on("chat_history", (messages: any[]) => {
  console.log("📜 Client1 chat history:", messages);
});


socket.on("disconnect", () => {
  console.log("❌ Client1 disconnected");
});
