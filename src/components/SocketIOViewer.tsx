import { saveAs } from "file-saver";
import { useCallback, useEffect, useRef, useState } from "react";
import { FixedSizeList } from "react-window";
import io from "socket.io-client";
import * as XLSX from "xlsx";
import expIcon from "../assets/icon/ic-exp.svg";
import {
  groupSymbols,
  LOST_TIMEOUT,
  MAX_MESSAGES,
  SOCKET_MAP,
} from "../utils/cfg";
import type { LostMessage, Message, RateLog } from "../utils/types";
import { RowCount } from "./rowTable/rowCount";
import { RowLost } from "./rowTable/rowLost";
import { RowMess } from "./rowTable/rowMess";

// Map vendor -> socket URL

export default function SocketViewer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lostMessages, setLostMessages] = useState<LostMessage[]>([]);
  const [rateLogs, setRateLogs] = useState<RateLog[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string>("APEC"); // default APEC

  const lastReceivedRef = useRef<number>(Date.now());
  const socketRef = useRef<any | null>(null);
  const listRef = useRef<FixedSizeList>(null);
  const lostListRef = useRef<FixedSizeList>(null);
  const rateListRef = useRef<FixedSizeList>(null);
  const lostStartRef = useRef<number | null>(null);
  const countPingRef = useRef<number>(0);
  const messagesRef = useRef<Message[]>([]);
  const subscribedSymbolsRef = useRef<Map<string, Map<string, Set<string>>>>(
    new Map()
  );

  // Init IO.Socket mỗi khi vendor đổi
  useEffect(() => {
    // reset dữ liệu khi đổi vendor
    setMessages([]);
    setLostMessages([]);
    setRateLogs([]);
    setActiveGroup(null);
    messagesRef.current = [];
    lostStartRef.current = null;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketUrl = SOCKET_MAP[vendor];
    if (!socketUrl) {
      console.error("Vendor không có URL socket:", vendor);
      return;
    }

    console.log("Connecting to", vendor, socketUrl);

    socketRef.current = io.connect(socketUrl, {
      autoConnect: true, // mặc định là true
      reconnection: true, // bật reconnect
      reconnectionAttempts: 5, // số lần thử reconnect (mặc định vô hạn)
      reconnectionDelay: 2000, // thời gian chờ giữa các lần reconnect (ms)
    });

    const socket = socketRef.current;

    const workerMess = new Worker(
      new URL("./workerService/socketWorker.ts", import.meta.url)
    );
    workerMess.onmessage = (e) => {
      if (e.data.type === "batch") {
        const batch = e.data.data.map((msg: string) => ({
          time: new Date().toLocaleTimeString(),
          content: msg,
        }));
        messagesRef.current.push(...batch);
        if (messagesRef.current.length > MAX_MESSAGES) {
          messagesRef.current.splice(
            0,
            messagesRef.current.length - MAX_MESSAGES
          );
        }
        setMessages([...messagesRef.current]);
      }
    };

    const workerCountMess = new Worker(
      new URL("./workerService/rateLoggerWorker.ts", import.meta.url)
    );
    workerCountMess.onmessage = (e) => {
      if (e.data.type === "tick") {
        setRateLogs((prev) => [...prev.slice(-MAX_MESSAGES + 1), e.data]);
      }
    };

    socket.on("connect", () => {
      console.log("Connected to", vendor);
      subscribedSymbolsRef.current.forEach((sourceMap, symbol) => {
        if (sourceMap.size > 0) {
          const message = { action: "join", data: symbol };
          socket.emit("regs", JSON.stringify(message));
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from", vendor);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("⚠️ Connection error:", error.message);
    });

    socket.on("public", (msg: { data: unknown }) => {
      if (!msg.data) return;
      const payload = JSON.stringify(msg.data);
      workerMess.postMessage({ type: "newMessage", payload });
      workerCountMess.postMessage({ type: "inc" });
      lastReceivedRef.current = Date.now();
    });

    socket.on("private", (msg: { action: string }) => {
      if (msg.action === "ping") sendPing();
    });

    socket.open();

    const pingInterval = setInterval(() => {
      if (socket.connected) sendPing();
    }, 10000);

    return () => {
      clearInterval(pingInterval);
      workerMess.terminate();
      workerCountMess.terminate();
    };
  }, [vendor]);

  // Check lost messages
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastReceivedRef.current > LOST_TIMEOUT) {
        if (!lostStartRef.current)
          lostStartRef.current = lastReceivedRef.current;
      } else {
        if (lostStartRef.current) {
          const lost: LostMessage = {
            startTime: new Date(lostStartRef.current).toLocaleTimeString(),
            endTime: new Date(lastReceivedRef.current).toLocaleTimeString(),
            duration: Math.round(
              (lastReceivedRef.current - lostStartRef.current) / 1000
            ),
          };
          setLostMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), lost]);
          lostStartRef.current = null;
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current && messages.length > 0)
      listRef.current.scrollToItem(messages.length - 1, "end");
    if (lostListRef.current && lostMessages.length > 0)
      lostListRef.current.scrollToItem(lostMessages.length - 1, "end");
    if (rateListRef.current && rateLogs.length > 0)
      rateListRef.current.scrollToItem(rateLogs.length - 1, "end");
  }, [messages.length, lostMessages.length, rateLogs.length]);

  const sendPing = useCallback(() => {
    if (!socketRef.current) return;
    countPingRef.current++;
    console.log("ping server", countPingRef.current);
    const msg = { action: "ping", mode: "sync", data: " " };
    socketRef.current.emit("regs", JSON.stringify(msg), () => {
      countPingRef.current = 0;
    });
  }, []);

  function subscribeGroup(group: string, groupName: string) {
    if (!socketRef.current) return;
    if (activeGroup) {
      socketRef.current.emit("regs", {
        action: "leave",
        data: JSON.stringify(groupSymbols[activeGroup]),
      });
    }
    socketRef.current.emit("regs", {
      action: "join",
      data: JSON.stringify(group),
    });
    setActiveGroup(groupName);
    console.log("Subscribed to:", groupName);
  }

  const exportLostMessages = useCallback(() => {
    if (lostMessages.length === 0) {
      alert("Không có dữ liệu Lost Messages để export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      lostMessages.map((item, idx) => ({
        STT: idx + 1,
        "Start Time": item.startTime,
        "End Time": item.endTime,
        "Duration (s)": item.duration,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LostMessages");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    const date = new Date();
    const formatted =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0");
    saveAs(data, `lost_messages_${formatted}.xlsx`);
  }, [lostMessages]);

  return (
    <>
      {/* chọn vendor */}
      <div className="mb-4">
        <label className="mr-2 font-bold text-white">Chọn vendor:</label>
        <select
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="border px-3 py-1 rounded bg-black"
        >
          {Object.keys(SOCKET_MAP).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {Object.keys(groupSymbols).map((g) => (
        <button
          key={g}
          className={`px-3 py-1 mr-2 mb-2 rounded cursor-pointer text-white ${
            activeGroup === g ? "bg-blue-600" : "bg-black "
          }`}
          onClick={() => subscribeGroup(groupSymbols[g], g)}
        >
          {g}
        </button>
      ))}

      <div className="grid grid-cols-5 gap-4 h-[500px]">
        {/* Messages */}
        <div className="border rounded bg-black text-green-400 col-span-3">
          <div className="px-2 py-1 font-bold text-white">Messages</div>
          <FixedSizeList
            ref={listRef}
            height={500}
            width="100%"
            itemCount={messages.length}
            itemSize={20}
            itemData={messages}
          >
            {RowMess}
          </FixedSizeList>
        </div>

        {/* Lost Messages */}
        <div className="border rounded bg-black text-red-400 col-span-1">
          <div className="px-2 py-1 font-bold text-white">
            Lost Messages
            <button
              className="float-right cursor-pointer"
              onClick={() => exportLostMessages()}
            >
              <img src={expIcon} alt="exp" />
            </button>
          </div>
          <FixedSizeList
            ref={lostListRef}
            height={500}
            width="100%"
            itemCount={lostMessages.length}
            itemSize={20}
            itemData={lostMessages}
          >
            {RowLost}
          </FixedSizeList>
        </div>

        {/* Rate Logs */}
        <div className="border rounded bg-black text-yellow-400 col-span-1">
          <div className="px-2 py-1 font-bold text-white">
            Messages / Second
          </div>
          <FixedSizeList
            ref={rateListRef}
            height={500}
            width="100%"
            itemCount={rateLogs.length}
            itemSize={20}
            itemData={rateLogs}
          >
            {RowCount}
          </FixedSizeList>
        </div>
      </div>
    </>
  );
}
