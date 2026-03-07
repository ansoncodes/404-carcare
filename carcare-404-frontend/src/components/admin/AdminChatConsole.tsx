/**
 * Phase 1 finding applied:
 * - Chat backend exists via chat-rooms/messages endpoints.
 * - Admin can view all chats but cannot post messages (read-only enforced by backend).
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, titleCase } from "@/lib/formatters";
import { useToast } from "@/providers/ToastProvider";
import { listUsers } from "@/services/auth.service";
import { listChatRooms, listMessages, markMessagesRead } from "@/services/chat.service";
import type { User } from "@/types/auth.types";
import type { ChatRoom, Message } from "@/types/chat.types";

interface AdminChatConsoleProps {
  initialSupervisorId?: string;
}

interface SupervisorInbox {
  supervisor: User;
  roomCount: number;
  unreadCount: number;
  lastMessageAt: string | null;
}

function sortByLatestRoom(rooms: ChatRoom[]): ChatRoom[] {
  return [...rooms].sort((a, b) => {
    const aTs = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTs = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTs - aTs;
  });
}

function sortMessages(items: Message[]): Message[] {
  return [...items].sort((a, b) => {
    const aTs = new Date(a.created_at).getTime();
    const bTs = new Date(b.created_at).getTime();
    return aTs - bTs;
  });
}

export function AdminChatConsole({ initialSupervisorId }: AdminChatConsoleProps) {
  const toast = useToast();
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(initialSupervisorId ?? "");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [search, setSearch] = useState("");

  const supervisorsQuery = useQuery({
    queryKey: ["admin-supervisors"],
    queryFn: () => listUsers("supervisor"),
  });
  const roomsQuery = useQuery({
    queryKey: ["admin-chat-rooms"],
    queryFn: listChatRooms,
    refetchInterval: 30000,
  });
  const messagesQuery = useQuery({
    queryKey: ["admin-all-messages"],
    queryFn: () => listMessages(),
    refetchInterval: 30000,
  });

  const supervisors = supervisorsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  const roomsBySupervisor = useMemo(() => {
    const map = new Map<string, ChatRoom[]>();
    rooms.forEach((room) => {
      const supervisorId = room.assigned_staff?.id;
      if (!supervisorId) {
        return;
      }
      const current = map.get(supervisorId) ?? [];
      current.push(room);
      map.set(supervisorId, current);
    });
    map.forEach((value, key) => {
      map.set(key, sortByLatestRoom(value));
    });
    return map;
  }, [rooms]);

  const inboxRows = useMemo<SupervisorInbox[]>(() => {
    return supervisors
      .map((supervisor) => {
        const assignedRooms = roomsBySupervisor.get(supervisor.id) ?? [];
        const roomIds = new Set(assignedRooms.map((room) => room.id));
        const roomMessages = messages.filter((message) => roomIds.has(message.room));

        let unreadCount = 0;
        let lastMessageAt: string | null = null;
        roomMessages.forEach((message) => {
          if (!message.is_read && message.sender.role === "supervisor") {
            unreadCount += 1;
          }
          if (!lastMessageAt || new Date(message.created_at).getTime() > new Date(lastMessageAt).getTime()) {
            lastMessageAt = message.created_at;
          }
        });

        return {
          supervisor,
          roomCount: assignedRooms.length,
          unreadCount,
          lastMessageAt,
        };
      })
      .sort((a, b) => {
        const aTs = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTs = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTs - aTs;
      });
  }, [messages, roomsBySupervisor, supervisors]);

  useEffect(() => {
    if (!selectedSupervisorId && inboxRows.length > 0) {
      setSelectedSupervisorId(inboxRows[0].supervisor.id);
    }
  }, [inboxRows, selectedSupervisorId]);

  useEffect(() => {
    if (!selectedSupervisorId) {
      return;
    }
    const supervisorRooms = roomsBySupervisor.get(selectedSupervisorId) ?? [];
    if (supervisorRooms.length === 0) {
      setSelectedRoomId("");
      return;
    }
    const roomExists = supervisorRooms.some((room) => room.id === selectedRoomId);
    if (!roomExists) {
      setSelectedRoomId(supervisorRooms[0].id);
    }
  }, [roomsBySupervisor, selectedRoomId, selectedSupervisorId]);

  const selectedRooms = selectedSupervisorId ? roomsBySupervisor.get(selectedSupervisorId) ?? [] : [];
  const selectedRoom = selectedRooms.find((room) => room.id === selectedRoomId) ?? null;

  const filteredMessages = useMemo(() => {
    if (!selectedRoomId) {
      return [];
    }
    const normalized = search.trim().toLowerCase();
    const thread = messages.filter((message) => message.room === selectedRoomId);
    if (!normalized) {
      return sortMessages(thread);
    }
    return sortMessages(thread).filter((message) => {
      const content = (message.content ?? "").toLowerCase();
      const sender = message.sender.full_name.toLowerCase();
      return content.includes(normalized) || sender.includes(normalized);
    });
  }, [messages, search, selectedRoomId]);

  const markReadMutation = useMutation({
    mutationFn: (roomId: string) => markMessagesRead(roomId),
    onSuccess: () => {
      roomsQuery.refetch();
      messagesQuery.refetch();
      toast.push("Thread updated", "Unread messages marked as read", "success");
    },
    onError: () => {
      toast.push("Update failed", "Could not mark messages as read", "error");
    },
  });

  if (supervisorsQuery.isLoading || roomsQuery.isLoading || messagesQuery.isLoading) {
    return (
      <div className="panel flex h-[74vh] items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="grid h-[74vh] overflow-hidden rounded-xl border border-slate-800/50 bg-[#0b1422] lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-slate-800/60 lg:border-b-0 lg:border-r">
        <div className="border-b border-slate-800/60 px-4 py-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Supervisors</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Admin can view all supervisor threads.</p>
        </div>

        <div className="max-h-[calc(74vh-64px)] overflow-y-auto">
          {inboxRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--text-secondary)]">No supervisor threads available.</p>
          ) : (
            inboxRows.map((row) => {
              const active = row.supervisor.id === selectedSupervisorId;
              return (
                <button
                  key={row.supervisor.id}
                  type="button"
                  className={`w-full border-b border-slate-800/40 px-4 py-3 text-left transition ${
                    active ? "bg-cyan-500/10" : "hover:bg-slate-900/40"
                  }`}
                  onClick={() => setSelectedSupervisorId(row.supervisor.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{row.supervisor.full_name}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{row.supervisor.email}</p>
                    </div>
                    {row.unreadCount > 0 ? (
                      <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
                        {row.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {row.roomCount} thread{row.roomCount === 1 ? "" : "s"} · {row.lastMessageAt ? formatDate(row.lastMessageAt) : "No messages"}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedRoom?.assigned_staff?.full_name ?? "Select a supervisor"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {selectedRoom
                ? `${typeof selectedRoom.booking === "string" ? "Booking" : selectedRoom.booking.booking_reference} · ${selectedRoom.airport?.code ?? "N/A"}`
                : "Choose a supervisor from the left panel."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedRoomId ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markReadMutation.mutate(selectedRoomId)}
                disabled={markReadMutation.isPending}
              >
                {markReadMutation.isPending ? "Updating..." : "Mark as read"}
              </Button>
            ) : null}
            {selectedSupervisorId ? (
              <Link
                href={`/admin/chat/${selectedSupervisorId}`}
                className="inline-flex h-8 items-center rounded-lg border border-slate-700/70 px-3 text-xs text-slate-200 transition hover:border-cyan-400/50"
              >
                Open route
              </Link>
            ) : null}
          </div>
        </div>

        {selectedRooms.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-b border-slate-800/60 px-4 py-2">
            {selectedRooms.map((room) => {
              const roomActive = room.id === selectedRoomId;
              const bookingRef = typeof room.booking === "string" ? room.booking.slice(0, 8) : room.booking.booking_reference;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    roomActive
                      ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100"
                      : "border-slate-700/50 bg-slate-900/40 text-slate-300"
                  }`}
                >
                  {bookingRef}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="border-b border-slate-800/60 px-4 py-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Search" placeholder="Search messages" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <span className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Search className="size-3" />
              Read-only
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!selectedRoomId ? (
            <p className="pt-8 text-center text-sm text-[var(--text-secondary)]">No thread selected.</p>
          ) : filteredMessages.length === 0 ? (
            <p className="pt-8 text-center text-sm text-[var(--text-secondary)]">No messages found for this thread.</p>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message) => {
                const fromSupervisor = message.sender.role === "supervisor";
                return (
                  <article
                    key={message.id}
                    className={`rounded-lg border px-3 py-2 ${
                      fromSupervisor
                        ? "border-cyan-400/30 bg-cyan-500/10"
                        : "border-slate-700/60 bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{message.sender.full_name}</p>
                      <span className="text-[11px] text-[var(--text-muted)]">{formatDate(message.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{message.content ?? "-"}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">{titleCase(message.message_type)}</p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
