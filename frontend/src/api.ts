import axios from "axios";

export const addBook = async (prompt: string) => {
  const res = await axios.post("http://localhost:3001/add-book", { prompt });
  return res.data;
};

export const updateBook = async (pageId: string, prompt: string) => {
  const res = await axios.post("http://localhost:3001/update-book", {
    pageId,
    userInput: prompt,
  });
  return res.data;
};

export const createReadingPlan = async (message: string) => {
  const res = await axios.post("http://localhost:3001/reading-plan", { message });
  return res.data;
};
