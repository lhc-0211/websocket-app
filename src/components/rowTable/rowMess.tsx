import type { Message, RowProps } from "../../utils/types";

export const RowMess = ({ index, style, data }: RowProps<Message>) => {
  const item = data && data.length > 0 ? data[index] : null;
  if (!item) return null;

  const content =
    typeof item.content === "string"
      ? item.content
      : JSON.stringify(item.content);

  return (
    <div style={style} className="px-2 text-xs font-mono text-left">
      <span className="text-green-400">{content}</span>
    </div>
  );
};
