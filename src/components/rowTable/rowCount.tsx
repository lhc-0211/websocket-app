import type { RateLog, RowProps } from "../../utils/types";

export const RowCount = ({ index, style, data }: RowProps<RateLog>) => {
  const item = data && data.length > 0 ? data[index] : null;

  if (!item) return null;

  return (
    <div style={style} className="px-2 text-xs font-mono">
      <span className="text-yellow-400">
        {item.time} - {item.count}
      </span>
    </div>
  );
};
