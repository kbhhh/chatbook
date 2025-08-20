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


# 2. Architecture Structure  

![Architecture Structure](./docs/images/archi.drawio.png)  


### 📌 Explanation  
- **User & Chatbot UI**: Frontend built with React + Vite + TypeScript, providing a lightweight, interactive chat interface.  
- **Agentica + OpenAI**: Natural language requests are processed through LLM for classification, summarization, and reasoning.  
- **Express Server**: Middleware that handles validation, mapping, and data transformation between systems.  
- **Oracle Cloud (Autonomous DB)**: The single source of truth, storing structured relational data with secure mTLS.  
- **Notion**: Final user-facing interface where logs, plans, reflections, and recommendations are recorded in a structured template.


 # 3. Data Flow

The data flow of **ChatBook** ensures secure, structured, and automated synchronization between user input and the Notion interface.

![Data Flow](./docs/images/dataFlow.drawio.png)

### 🔹 Steps
1) **Oracle DB (Autonomous)**
   - **Source of Truth**: All relational data (normalized, FK relations)  
   - Tables: `BOOK_INFO`, `READING_LOG`, `READING_PLAN`, `RECOMMENDATION`, `READING_PROGRESS`  
   - Access secured via **mTLS** (mutual TLS)  

2) **Express Server (Data Transformation Layer)**
   - Maps and transforms **SQL ↔ JSON**  
   - Provides REST API endpoints for frontend and Agentica  
   - Handles validation, mapping rules, and business logic  

3) **Notion Template DB**
   - User-facing interface with **structured templates**  
   - Four key templates:  
     - 📚 **Bookshelf** (Book registration, metadata)  
     - 📅 **Calendar** (Reading plans, schedules)  
     - ✍️ **Reflection** (Reading notes, thoughts)  
     - 💡 **Recommendation** (AI-powered suggestions)  

👉 This flow guarantees:
- **Data integrity** between Oracle and Notion  
- **Real-time synchronization** of reading logs and reflections  
- **Scalability** with enterprise-level DB + lightweight Notion templates


# 4. Installation & Setup  

### 📌 Requirements  
- Node.js v18+  
- Oracle Instant Client + **OCI Wallet** (for Autonomous DB mTLS connection)  
- Notion account with API integration enabled  
- Cloudinary account (for media uploads)  
- Google Books API Key (for book search and metadata)  

### 📌 Environment Variables (.env)  
Create a `.env` file in the root directory and fill in the following values:  

```bash
# Server
PORT=3001

# LLM 
OPENAI_API_KEY=

# Notion integration
NOTION_TOKEN=
NOTION_DATABASE_ID=
NOTION_READDATABASE_ID=
RECOMMENDED_BOOK_DB_ID=
NOTION_CALENDAR_DB_ID=
NOTION_REVIEW_DB_ID=

# Google Books API
GOOGLE_BOOKS_API_KEY=

# Cloudinary (media upload)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Oracle Autonomous DB (mTLS)
ORACLE_USER=
ORACLE_PW=
ORACLE_CONNECT=          # e.g. db2025_high
ORACLE_WALLET_PATH=      # path to OCI Wallet
ORACLE_CLIENT_PATH=      # path to Instant Client
TNS_ADMIN=               # path containing sqlnet.ora, tnsnames.ora


