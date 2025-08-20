# 1. ChatBook: AI Reading Companion  

ChatBook is an AI-powered reading management system built on the **Agentica** framework.  
It is designed to revive the depth and consistency of reading habits that are fading in today’s digital era.  
As people become accustomed to quick searches and instant answers, their ability to read, comprehend, and reflect on longer texts is gradually diminishing.  

Through a conversational chatbot interface, ChatBook helps users build and sustain meaningful reading habits with ease.  

![ChatBook Identity](./docs/images/projectIntro.png)  
*(Visual identity & branding for the project)*  


## 🎯 Motivation & Purpose  
ChatBook is more than just a logging tool — it aims to become an **“AI reading partner that turns books into a daily habit.”**  

- 📌 **Automated Reading Logs**  
  → Simple prompts like *“Register Capital”* or *“I read 50 pages today”* are instantly recorded without manual entry.  

- 📌 **Seamless Productivity Integration**  
  → All records are synced in real-time to **Notion templates**, where users can view their bookshelf, calendar, reflections, and book recommendations.  

- 📌 **Enhanced Learning Efficiency**  
  → From reading schedules → reflections → personalized recommendations, ChatBook provides a consistent and structured reading journey.  


## ✨ Core Values  

- **Conversation-driven UX**  
  Manage your entire reading process through natural chatbot dialogue, without tedious manual entry.  

- **Personalized Experience**  
  Get book suggestions powered by LLMs and tailored to your reflections and reading history.  

- **Automated Record-keeping**  
  Reduce the burden of manual tracking and focus on building sustainable reading habits.  


🚀 ChatBook is not just a record-keeping tool — it’s an AI companion that supports your entire reading life.


# 2. 🏗️ Architecture Structure  

![Architecture Structure](./docs/images/archi.drawio.png)  


### 📌 Explanation  
- **User & Chatbot UI**: Frontend built with React + Vite + TypeScript, providing a lightweight, interactive chat interface.  
- **Agentica + OpenAI**: Natural language requests are processed through LLM for classification, summarization, and reasoning.  
- **Express Server**: Middleware that handles validation, mapping, and data transformation between systems.  
- **Oracle Cloud (Autonomous DB)**: The single source of truth, storing structured relational data with secure mTLS.  
- **Notion**: Final user-facing interface where logs, plans, reflections, and recommendations are recorded in a structured template.  
