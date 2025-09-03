import { useEffect, useRef, useState } from "react";
import { FixedSizeList } from "react-window";
import { io, Socket } from "socket.io-client";

const MAX_MESSAGES = 10000;

// Định nghĩa kiểu cho RowProps
type RowProps = {
  index: number;
  style: React.CSSProperties;
  data: string[];
};

function Row({ index, style, data }: RowProps) {
  return (
    <div style={style} className="px-2">
      {data[index] || ""}
    </div>
  );
}

export default function SocketIOViewer() {
  const [messages, setMessages] = useState<string[]>([]);
  const [symbol, setSymbol] = useState<string>(""); // State cho input mã chứng khoán
  const queueRef = useRef<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FixedSizeList>(null);

  // Khởi tạo Socket.IO
  useEffect(() => {
    let retryTimer: number | null = null;

    const initSocket = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io("http://202.124.204.95:9999/ps", {
        autoConnect: false,
        reconnection: false,
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Connected to Socket.IO server");
      });

      socket.on("message", (msg: string) => {
        queueRef.current.push(msg);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected, will retry...");
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            initSocket(); // gọi lại
          }, 2000); // delay 2s tránh loop quá nhanh
        }
      });

      socket.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error);
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            initSocket(); // gọi lại
          }, 2000);
        }
      });
    };

    initSocket();

    const interval = setInterval(() => {
      if (queueRef.current.length > 0) {
        setMessages((prev) => {
          const next = [...prev, ...queueRef.current].slice(-MAX_MESSAGES);
          queueRef.current = [];
          return next;
        });
      }
    }, 100);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      clearInterval(interval);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Auto-scroll tới tin nhắn mới nhất
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, "end");
    }
  }, [messages.length]);

  // Xử lý gửi yêu cầu join
  const handleJoin = () => {
    if (socketRef.current && symbol.trim()) {
      const message = JSON.stringify({ action: "join", data: symbol.trim() });
      socketRef.current.emit("regs", message);
      setSymbol(""); // Xóa input sau khi gửi
    }
  };

  // Xử lý gửi yêu cầu leave
  const handleLeave = () => {
    if (socketRef.current && symbol.trim()) {
      const message = JSON.stringify({ action: "leave", data: symbol.trim() });
      socketRef.current.emit("message", message);
      setSymbol(""); // Xóa input sau khi gửi
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Nhập mã chứng khoán (VD: ACB, MBS)"
          className="px-2 py-1 border rounded text-white font-mono text-sm placeholder:text-gray-400 w-[300px]"
        />
        <button
          onClick={handleJoin}
          className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Đăng ký
        </button>
        <button
          onClick={handleLeave}
          className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Hủy đăng ký
        </button>
      </div>
      <div className="h-[500px] w-full border rounded bg-black text-green-400 font-mono text-xs">
        <FixedSizeList
          ref={listRef}
          height={500}
          width="100%"
          itemSize={20}
          itemCount={messages.length}
          itemData={messages}
        >
          {Row}
        </FixedSizeList>
      </div>
    </div>
  );
}
