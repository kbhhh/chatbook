import { Agentica } from "@agentica/core";
import OpenAI from "openai";
import { BookAgentService } from "./BookAgentService.ts";
import { SmalltalkService } from "./SmalltalkService.ts";

//책 관련 기능 정의
function bookApplication(): any {
  return {
    model: "chatgpt",
    errors: [],
    functions: [
      {
        name: "addBook",
        description: "새 책 등록",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string" }
          },
          required: ["prompt"]
        },
        validate: (args: any) => {
          if (!args || typeof args.prompt !== "string") {
            throw new Error("prompt는 문자열이어야 합니다.");
          }
          return true;
        }
      },
      {
        name: "updateBook",
        description: "책 속성/감상 업데이트",
        parameters: {
          type: "object",
          properties: {
            userInput: { type: "string" }
          },
          required: ["userInput"]
        },
        validate: (args: any) => {
          if (!args || typeof args.userInput !== "string") {
            throw new Error("userInput은 문자열이어야 합니다.");
          }
          return true;
        }
      },
      {
        name: "createReadingPlan",
        description: "독서 계획 생성",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"]
        },
        validate: (args: any) => {
          if (!args || typeof args.message !== "string") {
            throw new Error("message는 문자열이어야 합니다.");
          }
          return true;
        }
      },
      {
        name: "recommendBooks",
        description: "리뷰/프롬프트 기반 추천",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            review: { type: "string" }
          }
        },
        validate: (args: any) => {
          if (!args) throw new Error("arguments는 필수입니다.");
          if (args.prompt && typeof args.prompt !== "string")
            throw new Error("prompt는 문자열이어야 합니다.");
          if (args.review && typeof args.review !== "string")
            throw new Error("review는 문자열이어야 합니다.");
          return true;
        }
      },
      {
        name: "updateReadingProgress",
        description: "진행도 업데이트",
        parameters: {
          type: "object",
          properties: {
            bookName: { type: "string" },
            page: { type: "number" }
          },
          required: ["bookName", "page"]
        },
        validate: (args: any) => {
          if (!args || typeof args.bookName !== "string" || typeof args.page !== "number") {
            throw new Error("bookName은 문자열, page는 숫자여야 합니다.");
          }
          return true;
        }
      }
    ]
  };
}

//일상 대화 관련 기능 정의
function smalltalkApplication(): any {
  return {
    model: "chatgpt",
    errors: [],
    functions: [
      {
        name: "chat",
        description: "일반적인 잡담 처리",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"]
        },
        validate: (args: any) => {
          if (!args || typeof args.message !== "string") {
            throw new Error("message는 문자열이어야 합니다.");
          }
          return true;
        }
      },
    
      {
        name: "getHelp",
        description: "챗봇 사용법과 기능에 대한 도움말을 제공합니다.",
        parameters: {
          type: "object",
          properties: {}
        },
        validate: () => true
      }
    ]
  };
}

//Agentica 기반 AI Agent 생성
export function createAgent() {
  return new Agentica<"chatgpt">({
    model: "chatgpt",
    vendor: {
      api: new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }),
      model: "gpt-4o-mini",
    },
    controllers: [
      {
        protocol: "class",
        name: "smalltalk",
        application: smalltalkApplication(),
        execute: new SmalltalkService(),
      },
      {
        protocol: "class",
        name: "book",
        application: bookApplication(),
        execute: new BookAgentService(),
      },
      
    ],
    config: {
      systemPrompt: {
        common: () => [
          "너는 'Agentica' 시스템에서 동작하는 독서 도우미이자 대화 상대야.",
            "사용자의 발화가 책 관련 '작업 요청'이 아니라면, 무조건 smalltalk 컨트롤러의 `chat` 함수를 호출해.",
            "",
            "책 관련 '작업 요청'이란 다음과 같은 명확한 행동을 의미해:",
            "- 새 책 등록 (`addBook`)",
            "- 책 정보/감상 업데이트 (`updateBook`)",
            "- 독서 계획 생성 (`createReadingPlan`)",
            "- 책 추천 요청 (`recommendBooks`)",
            "- 독서 진행도 업데이트 (`updateReadingProgress`)",
            "",
            "이러한 명확한 작업 요청이 아닌 경우에는, 사용자의 발화에 '책'이라는 단어가 포함되어 있더라도 book 컨트롤러를 호출해서는 안 돼.",
            "만약 사용자가 '도움말'을 요청하면, **반드시 smalltalk.getHelp 함수를 호출해야 해.**",
            "",
            "예시:",
            "사용자: 안녕 -> smalltalk.chat({ message: '안녕' })",
            "사용자: 요즘 읽은 책 있어? -> smalltalk.chat({ message: '요즘 읽은 책 있어?' })",
            "사용자: 도움말 보여줘 -> smalltalk.getHelp({})",
            "",
            "사용자: '데미안' 책 좀 등록해줘 -> book.addBook({ prompt: '데미안 책 좀 등록해줘' })",
            "사용자: 동물농장 읽을래 -> book.addBook({ prompt: '동물농장 읽을래' })",
            "",
            "사용자: 데미안 100페이지까지 읽었어. 싱클레어가 드디어 알을 깨고 나왔어. -> book.updateBook({ userInput: '데미안 100페이지까지 읽었어. 싱클레어가 드디어 알을 깨고 나왔어.' })",
            "사용자: 동물농장 다 읽었어. 풍자적이라 인상 깊었어. -> book.updateBook({ userInput: '동물농장 다 읽었어. 풍자적이라 인상 깊었어.' })",
            "사용자: 동급생 10페이지까지 읽었을 때 주인공이 똑똑하다고 생각했어 -> book.updateBook({ userInput: '데미안 10페이지까지 읽었을 때 주인공이 똑똑하다는 생각이 들었어' })",

            "",
            "사용자: 데미안 독서 계획 세워줘 -> book.createReadingPlan({ message: '데미안 독서 계획 세워줘' })",
            "사용자: 동물농장 읽는 계획 세워줘 -> book.createReadingPlan({ message: '동물농장 읽는 계획 세워줘' })",
            "",
            "사용자: 데미안 같은 책 추천해줘 -> book.recommendBooks({ prompt: '데미안 같은 책 추천해줘' })",
            "",
            "사용자: 데미안 120페이지까지 읽었어 -> book.updateReadingProgress({ bookName: '데미안', page: 120 })",
            "",
            "[응답 모드 규칙]",
            "1) 함수 호출이 명확하면 JSON만 반환 (설명 금지)",
            "2) 일반 대화는 자연어로 정중하게 응답",
            "3) 한 번에 하나의 함수만 호출"

        ].join("\n"),
      },
      locale: "ko-KR",
      timezone: "Asia/Seoul",
      retry: 3,
    },
  });
}
