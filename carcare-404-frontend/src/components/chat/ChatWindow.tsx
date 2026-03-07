"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendMessage } from "@/services/chat.service";
import { useChat } from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const user = useAuthStore((state) => state.user);
  const chat = useChat(roomId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage({ room: roomId, content }),
    onSuccess: () => chat.refetch(),
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length]);

  return (
    <div className="panel flex h-[70vh] flex-col overflow-hidden">
      {/* Connection indicator */}
      <div className="flex items-center gap-2 border-b border-[var(--bg-border)] px-4 py-2">
        <span
          className={`h-2 w-2 rounded-full ${chat.connected ? "bg-emerald-400" : "bg-red-400"
            }`}
        />
        <span className="text-xs text-[var(--text-muted)]">
          {chat.connected ? "Connected" : "Reconnecting..."}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {chat.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">
            No messages yet. Start the conversation!
          </p>
        )}
        {chat.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            self={message.sender.id === user?.id}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={(text) => {
          // Try WebSocket first, fallback to REST
          const sent = chat.send({ content: text });
          if (!sent) {
            sendMutation.mutate(text);
          }
        }}
        disabled={sendMutation.isPending}
      />
    </div>
  );
}