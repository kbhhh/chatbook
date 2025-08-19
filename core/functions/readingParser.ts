// 입력 문자열에서 페이지와 감상 내용을 추출하는 함수
export function parsePageAndReview(input: string, note?: string) {
  const exact = /(?:^|[\s,])(\d{1,5})\s*(?:쪽|페이지|p\.?|pg\.?)(?:\s*까지)?\s*읽었을\s*때[\s\.\,\-\:\;\)\]]*(.+)$/i;
  let m = input.match(exact);
  if (m) {
    const page = Number(m[1]) || 1;
    let content = (m[2] || "");
    content = cleanupContent(content);
    if (!content) content = `${page}쪽까지 읽음`;
    return { page, content };
  }

  // 느슨한 패턴처리
  const loose = /(?:^|[\s,])(\d{1,5})\s*(?:쪽|페이지|p\.?|pg\.?)(?:\s*까지)?\s*(?:읽(?:었(?:어|습니다)?|음))?[\s\.\,\-\:\;\)\]]*(.+)$/i;
  m = input.match(loose);
  if (m) {
    const page = Number(m[1]) || 1;
    let content = (m[2] || "");
    content = cleanupContent(content);
    if (!content) content = `${page}쪽까지 읽음`;
    return { page, content };
  
  }
  return { page: 1, content: cleanupContent(note?.trim() || input.trim() || "1쪽까지 읽음") };
}

// 감상 텍스트를 정리하고 불필요한 접두어나 공백을 제거하는 함수
function cleanupContent(text: string) {
  return text
    .replace(/^(나의\s*)?감상은\s*/i, "")
    .replace(/^내\s*생각은\s*/i, "")
    .replace(/^[\s\.\,\-\:\;\~\|\)\]]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

