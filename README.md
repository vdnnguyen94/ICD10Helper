# 🩺 Medical Coder AI Web Application

A stateless web application that helps healthcare professionals and students search ICD-10-CA codes using AI (Gemini + ChatGPT). It supports both quick lookups and full-document coding for inpatient/outpatient records, with user feedback tracking.

---

## 🚀 Features

- 🔍 **Medical Code Lookup**  
  Search ICD-10-CA codes by entering medical terms. Gemini and ChatGPT return suggestions with confidence score and guidance if they disagree.

- 🧾 **Advanced Document Coding**  
  Paste de-identified hospital/clinic documents (inpatient or outpatient) and get AI-generated code lists. Compare results from both models.

- 👍 **Feedback System**  
  Users can like/dislike the response, logged via MongoDB (no account required).

- 🔐 **Stateless Design**  
  No patient data is stored. Only anonymous feedback and logs are tracked.

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| Frontend    | React + Apollo Client (static site) |
| Backend     | NestJS + GraphQL + Axios            |
| AI Models   | OpenAI GPT-4o + Google Gemini APIs  |
| Database    | MongoDB Atlas (free shared tier)    |
| CI/CD       | GitHub Actions                      |
| Hosting     | Vercel (frontend) + Render (backend)|

---

## 🧭 Project Structure (Monorepo)
medical-coder-app/
├── client/ # React frontend (Vite or CRA)
├── server/ # NestJS backend (GraphQL + MongoDB)
├── shared/ # Optional shared types
├── .github/workflows/ # GitHub Actions CI/CD
├── README.md
└── package.json


---

## ✅ Master Plan

### 📂 Phase 1: Planning & Setup

- [x] Define features and tech stack
- [x] Choose monorepo structure
- [x] Create GitHub repo and `.env` template
- [x] Plan prompts for Gemini and ChatGPT

---

### 💻 Phase 2: Frontend (React)

- [ ] Create project with Vite or CRA
- [ ] Implement:
  - Code lookup page
  - Document analyzer page
  - Feedback buttons
- [ ] Connect to GraphQL API via Apollo Client
- [ ] Deploy static site to Vercel
- [ ] Add GitHub Actions for frontend deploy

---

### 🧠 Phase 3: Backend (NestJS + GraphQL)

- [ ] Create NestJS app with GraphQL
- [ ] Create services for:
  - codeLookup(term)
  - fullTextCoding(document, setting)
  - submitFeedback(queryId, liked)
- [ ] Integrate Gemini & ChatGPT with custom prompts
- [ ] Connect MongoDB via Mongoose
- [ ] Deploy to Render (or Railway)

---

### 🧪 Phase 4: Testing & CI/CD

- [ ] Unit tests for backend services (Jest)
- [ ] Frontend smoke tests (React Testing Library)
- [ ] GitHub Actions:
  - On push: test + build + deploy
  - Separate steps for client/server

---

### 🌍 Phase 5: Deployment & Monitoring

- [ ] Add environment variables (MongoDB URI, API Keys)
- [ ] Monitor API uptime (UptimeRobot)
- [ ] Add optional analytics (e.g., Plausible)

---

## 🧾 Environment Variables (`.env`)

OPENAI_API_KEY=
GEMINI_API_KEY=
MONGODB_URI=

---

## 📦 Deployment Plan

| Component  | Platform | Notes |
|------------|----------|-------|
| Frontend   | Vercel   | Auto-deploy static app |
| Backend    | Render   | Deploy with GitHub hook |
| Database   | MongoDB Atlas | Free tier for feedback/logging |

---

## 📌 Future Enhancements

- Authentication (optional)
- Export logs as CSV
- Prompt customization UI
- Add ICD-10-CA dataset for fuzzy matching fallback

---

## 🧑‍💻 Author

Van Nguyen (Grace)  
Medical + Software Enthusiast | Canada

