import clsx from "clsx";
import type { Message } from "@/types/chat.types";

interface MessageBubbleProps {
  message: Message;
  self: boolean;
}

export function MessageBubble({ message, self }: MessageBubbleProps) {
  return (
    <div
      className={clsx(
        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
        self ? "ml-auto bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
      )}
    >
      {!self ? <p className="mb-1 text-[10px] uppercase tracking-[0.05em] opacity-70">{message.sender.full_name}</p> : null}
      {message.content}
    </div>
  );
}