let socket = null;

const initializeSocket = (io) => {
  if (!socket) {
    socket = io;
    socket.on("connection", (connectedSocket) => {
      console.log("A client connected:", connectedSocket.id);
      connectedSocket.on("join", (userId) => {
        connectedSocket.join(userId);
        console.log(`User ${userId} joined room`);
      });
      connectedSocket.on("disconnect", () => {
        console.log("A client disconnected:", connectedSocket.id);
      });
    });
  }
  return socket;
};

const getSocket = () => {
  if (!socket) {
    throw new Error("Socket chưa được khởi tạo! Vui lòng gọi initializeSocket trước.");
  }
  return socket;
};

const notifyProductRemoved = (userId, productName, reason) => {
  const io = getSocket();
  if (io) {
    const message = `Sản phẩm "${productName}" của bạn đã bị gỡ. Lý do: ${reason}`;
    io.to(userId).emit("productRemovedByAdmin", { userId, message });
    console.log(`Sent notification to user ${userId}: ${message}`);
  } else {
    console.warn("Không thể gửi thông báo: Socket chưa được khởi tạo.");
  }
};

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

module.exports = { initializeSocket, getSocket, notifyProductRemoved, disconnectSocket };