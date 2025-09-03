import { useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";

type RateLog = { time: string; count: number };
type LostLog = { start: string; end: string; duration: number };

declare global {
  interface Window {
    messageRateLog?: RateLog[];
    lostMessageLog?: LostLog[];
  }
}

export default function SocketMonitor() {
  const [rateLogs, setRateLogs] = useState<RateLog[]>([]);
  const [lostLogs, setLostLogs] = useState<LostLog[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.messageRateLog) {
        setRateLogs([...window.messageRateLog].slice(-500)); // giữ 500 dòng cuối
      }
      if (window.lostMessageLog) {
        setLostLogs([...window.lostMessageLog]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 text-xs font-mono h-[565px]">
      {/* Bảng 1: Message/second */}
      <div className="border rounded bg-gray-900 text-green-400 p-2 flex flex-col">
        <h3 className="font-bold mb-2 text-white">Messages / Second</h3>
        <div className="flex-1">
          <List
            height={500} // chiều cao list
            itemCount={rateLogs.length}
            itemSize={20} // chiều cao mỗi dòng
            width="100%"
          >
            {({ index, style }) => {
              const r = rateLogs[index];
              return (
                <div style={style} className="flex justify-between px-1">
                  <span>{r.time}</span>
                  <span>{r.count}</span>
                </div>
              );
            }}
          </List>
        </div>
      </div>

      {/* Bảng 2: Lost connection log */}
      <div className="border rounded bg-gray-900 text-red-400 p-2 flex flex-col">
        <h3 className="font-bold mb-2 text-white">Lost Message Logs</h3>
        <div className="flex-1">
          <List
            height={500}
            itemCount={lostLogs.length}
            itemSize={20}
            width="100%"
          >
            {({ index, style }) => {
              const log = lostLogs[index];
              return (
                <div style={style} className="px-1">
                  ⚠ {log.start} - {log.end} ({log.duration}s)
                </div>
              );
            }}
          </List>
        </div>
      </div>
    </div>
  );
}
