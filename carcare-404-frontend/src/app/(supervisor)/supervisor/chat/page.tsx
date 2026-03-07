import { PageHeader } from "@/components/shared/PageHeader";
import { ChatRoomList } from "@/components/chat/ChatRoomList";

export default function SupervisorChatPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Chat Inbox" subtitle="Customer conversations" />
      <ChatRoomList />
    </section>
  );
}