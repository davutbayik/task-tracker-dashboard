# **Team Task Tracker Dashboard Application**

A lightweight **full-stack task management app** built for tracking tasks.  
It allows teams to create, assign, prioritize and track tasks with due dates in a modern, responsive UI.

---

## 🚀 **Tech Stack**

| Layer | Technology |
|-------|-------------|
| Backend API | **FastAPI**, SQLModel, SQLite |
| Frontend UI | **React**, TypeScript, TailwindCSS |
| ORM / Database | SQLModel + SQLite (file-based) |
| HTTP Client | Fetch API wrapper (in `/src/lib/api.ts`) |

---

## ✨ **Features**

- Add, edit, delete tasks
- Assign tasks to team members
- Mark complete / incomplete
- Priority levels (Low / Medium / High)
- Due dates (no past dates allowed)
- **Filtering by**:
  - Search
  - Status (complete / incomplete)
  - Assignee
  - Priority
  - Due date status (Overdue / Today / Upcoming)
- Responsive dashboard UI with modern styling
- Fast, simple, portable codebase

---

## 📦 **Project Structure**

```
project/
├─ backend/
│  ├─ main.py          # FastAPI app + endpoints
│  └─ requirements.txt # backend deps
│
└─ frontend/
   ├─ src/
   │  ├─ App.tsx       # main UI
   │  ├─ types.ts      # shared types for tasks
   │  └─ lib/api.ts    # fetch wrapper
   ├─ package.json
   └─ tailwind.config.js
```

---

## 🛠️ **Setup & Run Locally**

### 1️⃣ Clone the repo

```sh
git clone https://github.com/davutbayik/task-tracker-dashboard.git
cd <project_folder>
```

### 2️⃣ Backend (FastAPI)

```sh
cd backend
python -m venv .venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at:  
👉 **http://localhost:8000**  
Docs available at:  
👉 **http://localhost:8000/docs**

### 3️⃣ Frontend (React + Tailwind)

```sh
cd ../frontend
npm install
npm run dev
```

App runs at:  
👉 **http://localhost:5173** (Vite default)  
or\
👉 **http://localhost:{specified_port}**

---

## 🔁 **Environment Notes**

- Backend uses **SQLite** (`tasks.db`) — auto-created on first run.
- If schema changes → delete the `.db` file and restart.
- No external services required; this project runs fully local.

---

## 🧠 **Future Improvements**

This project demonstrates:

- Full CRUD API design with request validation
- Clear separation of backend & frontend concerns
- Reusable fetch wrapper + typed API responses
- Component architecture that can scale
- Filters, optimistic UI updates, and local state modeling

If extended for production:
- Add authentication (JWT/session)
- Replace SQLite with Postgres
- Move to componentized structure + Zustand/Redux
- Add CI/CD + containerization

---

## 🤝 License

MIT — free to learn from, build on, or reference.
