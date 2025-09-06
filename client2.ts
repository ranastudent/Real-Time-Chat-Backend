import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ Client2 connected:", socket.id);

  // Join chat room
  socket.emit("join_chat", { chatId: "room1" });

  // Send a test message after 4s
  setTimeout(() => {
    socket.emit("send_message", {
      chatId: "room1",
      content: "Hey Client1, I’m Client2 😎",
      senderId: "20a4ca8d-907e-44a3-bd7b-d2c63390939f",
    });
  }, 4000);
});

socket.on("system", (msg: any) => {
  console.log("📢 Client2 System:", msg);
});

socket.on("message", (msg: any) => {
  console.log("💬 Client2 got:", msg);
});

socket.on("chat_history", (messages: any[]) => {
  console.log("📜 Client2 chat history:", messages);
});


socket.on("disconnect", () => {
  console.log("❌ Client2 disconnected");
});
