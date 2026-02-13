export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date | string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
