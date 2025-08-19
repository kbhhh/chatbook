import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

interface Message {
  id: number;
  role: "user" | "bot";
  content: string;
}

const TEMP_NOTION_URL = "https://glory-impala-26f.notion.site/2397e4fff35f8097bfdbd02dbbc40996?source=copy_link";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "bot",
      content:
        "안녕하세요! 저는 당신의 독서 생활을 도와주는 챗북입니다. 무엇을 도와드릴까요?\n\n더 자세한 것을 원하시면 '도움말'을 입력해주세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notionUrl] = useState<string | null>(TEMP_NOTION_URL || null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3001/agent/chat", { prompt: input });

      const operationName = res.data.operation;
      const functionResult = res.data.value;
      const summary = res.data.summary;

      let botContent = "";

      switch (operationName) {
        case "addBook":
          if (functionResult?.clarification) {
            botContent = functionResult.message;
          } else {
            botContent = `"${functionResult?.title || "제목 없음"}" 등록 완료!\nNotion: ${functionResult?.notionPage?.url ?? "없음"}`;
          }
          break;


          
        case "updateBook": {
       const bookName = functionResult?.bookName;
       const page = functionResult?.page;
       const content = functionResult?.content;

       botContent = `${functionResult?.message || "감상 기록 저장 완료"}`;
         if (bookName) botContent += `\n책: ${bookName}`;
         if (typeof page === "number") botContent += `\n책갈피: ${page}쪽`;
         if (content) botContent += `\n\n감상:\n> ${content}`;
          break;
          }



        case "createReadingPlan":
          if (functionResult?.clarification) {
            botContent = functionResult.message;
          } else {
            botContent = `독서 일정 등록 완료!\n${functionResult?.title ?? ""}: ${functionResult?.start ?? ""} ~ ${functionResult?.end ?? ""}`;
          }
          break;



        case "recommendBooks":
         if (functionResult?.clarification) {
           botContent = functionResult.message;
         } else {
           botContent = ` ${functionResult?.message || "추천 도서 등록 완료!"}`;

       const books: { title: string; reason: string }[] =
       Array.isArray(functionResult?.books) ? functionResult.books : [];

         if (books.length > 0) {
           botContent += "\n\n 추천 도서 목록:\n";
           books.forEach((b, i) => {
           botContent += `\n${i + 1}. **${b.title}**\n   - 추천 이유: ${b.reason}\n`;
         });
         } else {
           botContent += "\n(추천 목록이 비어있어요)";
         }
         }
         break;



        case "updateReadingProgress":
          if (functionResult?.clarification) {
            botContent = functionResult.message;
          } else {
            botContent = `${functionResult?.message || "진행도 업데이트 완료!"}`;
          }
          break;
        case "chat":
          botContent = functionResult || "응답이 없습니다.";
          break;
        case "getHelp":
          botContent = functionResult || "도움말을 불러올 수 없습니다.";
          break;
        default:
          botContent = summary || "응답이 없습니다.";
      }

      const botMsg: Message = {
        id: Date.now() + 1,
        role: "bot",
        content: botContent,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      const errMsg: Message = {
        id: Date.now() + 2,
        role: "bot",
        content: "오류: " + (e.message || "알 수 없는 오류"),
      };
      setMessages((prev) => [...prev, errMsg]);
    }

    setLoading(false);
  };




  return (
    <div className={`app-shell ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <header className="topbar">
        <div className="brand">ChatBook</div>
        <div className="theme-switch">
          <span id="themeLabel" className="visually-hidden">
            테마
          </span>
          <button
            className={`theme-btn ${theme === "light" ? "active" : ""}`}
            aria-labelledby="themeLabel"
            onClick={() => setTheme("light")}
            type="button"
          >
            라이트
          </button>
          <button
            className={`theme-btn ${theme === "dark" ? "active" : ""}`}
            aria-labelledby="themeLabel"
            onClick={() => setTheme("dark")}
            type="button"
          >
            다크
          </button>
          <a
            className={`theme-btn notion-btn ${!notionUrl ? "is-disabled" : ""}`}
            href={notionUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            tabIndex={notionUrl ? 0 : -1}
            onClick={(e) => {
              if (!notionUrl) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            Notion
          </a>
        </div>
      </header>

      <div className="chat-wrap">
        <main className="chat-card">
          <div className="chat-log" ref={containerRef}>
            {messages.map(({ id, role, content }) => (
              <div key={id} className={`msg-row ${role === "user" ? "right" : "left"}`}>
                {role !== "user" && (
                  <img
                    src={theme === "light" ? "/bot-avatar-light.png" : "/bot-avatar-dark.png"}
                    alt="Bot"
                    className="chat-avatar"
                  />
                )}
                <div className={`msg-bubble ${role}`}>
                  <pre className="msg-text">{content}</pre>
                </div>
              </div>
            ))}
            {loading && (
              <div className="msg-row left">
                <img
                  src={theme === "light" ? "/bot-avatar-light.png" : "/bot-avatar-dark.png"}
                  alt="Bot"
                  className="chat-avatar"
                />
                <div className="msg-bubble bot">
                  <span className="loading-text">작성 중</span>
                  <span className="dot-typing" aria-hidden="true"></span>
                </div>
              </div>
            )}
          </div>

          <div className="composer">
            <label htmlFor="chatInput" className="visually-hidden">
              메시지 입력
            </label>
            <input
              id="chatInput"
              className="composer-input"
              type="text"
              placeholder='예: "데미안 등록해줘"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSend) sendMessage();
              }}
              disabled={loading}
            />
            <button
              className="composer-btn"
              onClick={sendMessage}
              disabled={!canSend}
              type="button"
            >
              전송
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
