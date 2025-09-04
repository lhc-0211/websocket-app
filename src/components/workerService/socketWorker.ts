let buffer: string[] = [];

// Worker nhận message từ main thread (React)
self.onmessage = (e: MessageEvent) => {
  if (e.data.type === "newMessage") {
    buffer.push(e.data.payload);
  }
};

// flush buffer mỗi 100ms
setInterval(() => {
  if (buffer.length > 0) {
    self.postMessage({ type: "batch", data: buffer });
    buffer = [];
  }
}, 100);
