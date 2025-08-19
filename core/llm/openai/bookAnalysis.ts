import { askOpenAI, askOpenAIJson } from "../../utils/openaiClient.ts";

// 주어진 텍스트에서 정확한 책 제목과 저자를 추출
export async function getBookTitleFromText(input: string) {
  const prompt = `
    다음 텍스트에서 책의 **정확한 제목**과 **정확한 저자**를 추출해줘.
    
    1. 텍스트에 포함된 정보만 사용해야 하며, 추론하거나 보정해서는 안 돼.
    2. '개미'와 같이 일반적인 단어가 포함되어 있더라도, 다른 작품으로 치환하지 마.
    3. 저자 이름은 '베르나르 베르베르'처럼 텍스트에 있는 그대로 추출해.
    4. 띄어쓰기를 포함한 표기 오류는 보정해서 반환해.
    5. 저자와 제목이 함께 제시되면, 이 두 정보를 연결하여 검색에 사용할 수 있도록 추출해줘.
    
    응답은 반드시 아래와 같은 JSON 객체로 반환해줘.
    
    입력: "${input}"
    출력 형식:
    {
      "main_title": "책 제목",
      "author": "저자"
    }
  `;
  return await askOpenAIJson(prompt);
}

// 텍스트에서 책 데이터 추출
export async function extractBookProperties(text: string) {
  const prompt = `
    다음 텍스트에서 책 정보를 추출하세요.
    항목: 제목, 저자, 출판사, 출판일(YYYY-MM-DD), 장르
    누락된 값은 'null'로 표시합니다. 어떤 경우에도 추론하지 마세요.
    출력 형식:
    {
      "title": "",
      "author": "",
      "publisher": "",
      "publishedDate": "",
      "genre": ""
    }
    텍스트:
    ${text}
  `;
  return await askOpenAIJson(prompt);
}

// 독서/책 관련 자유 질의응답 처리
export async function askAboutBooksFree(question: string) {
  return await askOpenAI(question);
}

// 리뷰 기반으로 책 3권을 추천하고, 추천 이유를 간결하게 포함
export async function getRecommendedBooksByReview(review: string) {
  const prompt = `
   다음 리뷰의 핵심 키워드와 감정을 먼저 분석하고, 
이 키워드와 감정과 직접적으로 연관된 책 3권을 추천해줘.  
각 추천 이유는 반드시 리뷰에서 언급된 구체적인 주제나 감정과 연결되도록 작성하고, 
200자 이내로 간결하지만 상세하게 설명해줘. 세 권 추천 해줘야해

출력 형식:
{
  "recommendations": [
    {
      "title": "책 제목1",
      "reason": "추천 이유1"
    },
    {
      "title": "책 제목2",
      "reason": "추천 이유2"
    },
    {
      "title": "책 제목3",
      "reason": "추천 이유3"
    }
  ]
}

리뷰:
${review}
  `;
  return await askOpenAIJson(prompt);
}
