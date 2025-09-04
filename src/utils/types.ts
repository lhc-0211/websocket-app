export type Message = { time: string; content: string };
export type LostMessage = {
  startTime: string;
  endTime: string;
  duration: number;
};
export type RowProps<T> = {
  index: number;
  style: React.CSSProperties;
  data: T[];
};

export type RateLog = { time: string; count: number };
