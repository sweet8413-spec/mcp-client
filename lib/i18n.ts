export type Language = "ko" | "zh" | "ja";

export interface Translations {
  // 사이드바
  sidebarTitle: string;
  closeSidebar: string;
  newChat: string;
  noHistory: string;
  rename: string;
  deleteChat: string;
  // 헤더
  toggleSidebar: string;
  reset: string;
  // 메시지
  startChat: string;
  startChatDesc: string;
  // 입력
  inputPlaceholder: string;
  inputHint: string;
  send: string;
  // 복사
  copy: string;
  copyCode: string;
  // 기본 대화 제목
  newChatTitle: string;
  // 언어 설정
  language: string;
}

const ko: Translations = {
  sidebarTitle: "AI 채팅",
  closeSidebar: "사이드바 닫기",
  newChat: "새 대화",
  noHistory: "대화 이력이 없습니다",
  rename: "이름 변경",
  deleteChat: "삭제",
  toggleSidebar: "사이드바 열기/닫기",
  reset: "초기화",
  startChat: "대화를 시작해보세요",
  startChatDesc: "아래 입력창에 메시지를 입력하면 대화가 시작됩니다",
  inputPlaceholder: "메시지를 입력하세요... (Shift+Enter로 줄바꿈)",
  inputHint: "Enter로 전송 · Shift+Enter로 줄바꿈",
  send: "전송",
  copy: "복사",
  copyCode: "코드 복사",
  newChatTitle: "새 대화",
  language: "언어",
};

const zh: Translations = {
  sidebarTitle: "AI 聊天",
  closeSidebar: "关闭侧边栏",
  newChat: "新对话",
  noHistory: "暂无聊天记录",
  rename: "重命名",
  deleteChat: "删除",
  toggleSidebar: "切换侧边栏",
  reset: "重置",
  startChat: "开始对话吧",
  startChatDesc: "在下方输入框中输入消息即可开始对话",
  inputPlaceholder: "请输入消息... (Shift+Enter换行)",
  inputHint: "Enter发送 · Shift+Enter换行",
  send: "发送",
  copy: "复制",
  copyCode: "复制代码",
  newChatTitle: "新对话",
  language: "语言",
};

const ja: Translations = {
  sidebarTitle: "AIチャット",
  closeSidebar: "サイドバーを閉じる",
  newChat: "新しい会話",
  noHistory: "チャット履歴がありません",
  rename: "名前変更",
  deleteChat: "削除",
  toggleSidebar: "サイドバー切替",
  reset: "リセット",
  startChat: "会話を始めましょう",
  startChatDesc: "下の入力欄にメッセージを入力すると会話が始まります",
  inputPlaceholder: "メッセージを入力... (Shift+Enterで改行)",
  inputHint: "Enterで送信 · Shift+Enterで改行",
  send: "送信",
  copy: "コピー",
  copyCode: "コードをコピー",
  newChatTitle: "新しい会話",
  language: "言語",
};

const translations: Record<Language, Translations> = { ko, zh, ja };

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  ko: "한국어",
  zh: "中文",
  ja: "日本語",
};

const LANG_STORAGE_KEY = "chat-language";

export function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && (saved === "ko" || saved === "zh" || saved === "ja")) {
      return saved;
    }
  } catch {}
  return "ko";
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}
