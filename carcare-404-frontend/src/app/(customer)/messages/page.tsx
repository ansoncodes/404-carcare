import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { PageHeader } from "@/components/shared/PageHeader";

export default function CustomerMessagesPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Messages" subtitle="Chats with assigned supervisors" />
      <ChatRoomList basePath="/messages" viewerRole="customer" />
    </section>
  );
}
