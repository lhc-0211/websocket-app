import type { LostMessage, RowProps } from "../../utils/types";

export const RowLost = ({ index, style, data }: RowProps<LostMessage>) => {
  const item = data && data.length > 0 ? data[index] : null;

  if (!item) return null;

  return (
    <div style={style} className="px-2 text-xs font-mono">
      <span className={"text-red-400"}>
        {item.startTime} - {item.endTime} ({item.duration} s)
      </span>
    </div>
  );
};
