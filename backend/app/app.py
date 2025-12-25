# Import necessary libraries
import os
from datetime import datetime, timezone, date
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Session, create_engine, select

# Load environment variables
load_dotenv()

# Hard-coded team members
TEAM_MEMBERS = [
    {"id": 1, "name": "Harry"},
    {"id": 2, "name": "John"},
    {"id": 3, "name": "Peter"},
    {"id": 4, "name": "Tom"},
]

# Allowed priority levels for the tasks
ALLOWED_PRIORITIES = {"low", "medium", "high"}


def user_exists(user_id: Optional[int]) -> bool:
    """Helper function for checking if given user_id exists within TEAM MEMBERS"""
    
    if user_id is None:
        return False

    return any(user["id"] == user_id for user in TEAM_MEMBERS)


def validate_priority(value: Optional[str]) -> str:
    """Helper function for validating task priority within ALLOWED_PRIORITIES"""
    
    if value is None:
        return "medium"
    
    val = value.lower()
    
    if val not in ALLOWED_PRIORITIES:
        raise HTTPException(status_code=400, detail="priority must be one of low|medium|high")

    return val


# Initialize the Sqlite DB usign SQLModel (Sqlite can be replaced with PostgreSQL in production stages)
DATABASE_URL = os.getenv("DATABASE_URL")
db_engine = create_engine(DATABASE_URL, echo=False)


# Define database model called 'Task'
class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    completed: bool = False
    assignee_id: Optional[int] = None
    priority: str = Field(default="medium", max_length=10)  # "low" | "medium" | "high"
    due_date: Optional[date] = None                         # Format -> YYYY-MM-DD
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))


# Request Schemas for API validation
class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assignee_id: Optional[int] = None
    priority: str = "medium"          
    due_date: Optional[date] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None


# Initialize the application
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(db_engine)
    yield
    
    
# Create and initialize the FastAPI App
app = FastAPI(title="Task Tracker API", lifespan=lifespan)

# Configure for the allowed URLs for API requests to prevent unsecure/malicious requests.
# Vite uses port 5173 for default frontend initialization
# MUST change the URL and ports in production stages with real endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("ALLOW_ORIGIN_URL"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Define the API endpoints
@app.get("/")
def read_root():
    """Health check endpoint for the application. Does not affect anything in the backend"""
    
    return {"status": "The FastAPI backend is LIVE"}


@app.get("/users")
def list_users():
    """Lists hard-coded TEAM MEMBERS when a GET request is sent to /users endpoint"""
    # TO-DO for prodcution: Replace hard-coded team members with actual team members fetched from a database table or any other source
    
    return TEAM_MEMBERS


@app.get("/tasks")
def list_tasks(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None, description="all|complete|incomplete"),
    assignee_id: Optional[int] = Query(default=None),
    priority: Optional[str] =  Query(default=None, description="low|medium|high"),
    due: Optional[str] = Query(
        default=None, description="all|overdue|today|upcoming"
    )
):
    """Lists created tasks when a GET request is sent to /tasks endpoint"""
    
    today = date.today()
    
    with Session(db_engine) as session:
        sql_statement = select(Task) # select statement for 'Task' model

        # search filter
        if search:
            sql_statement = sql_statement.where(
                (Task.title.contains(search)) | (Task.description.contains(search))
            )

        # status filter
        if status == "complete":
            sql_statement = sql_statement.where(Task.completed == True)
        elif status == "incomplete":
            sql_statement = sql_statement.where(Task.completed == False)

        # assignee_id filter
        if assignee_id is not None:
            sql_statement = sql_statement.where(Task.assignee_id == assignee_id)

        # priorty filter
        if priority:
            pr = validate_priority(priority)
            sql_statement = sql_statement.where(Task.priority == pr)

        # due_date filter
        if due == "overdue":
            sql_statement = sql_statement.where(Task.due_date.is_not(None)).where(Task.due_date < today)
        elif due == "today":
            sql_statement = sql_statement.where(Task.due_date == today)
        elif due == "upcoming":
            sql_statement = sql_statement.where(Task.due_date.is_not(None)).where(Task.due_date > today)

        sql_statement = sql_statement.order_by(Task.completed.asc(), Task.created_at.desc())
        rows = session.exec(sql_statement).all()

    user_map = {
        user["id"]: user["name"] for user in TEAM_MEMBERS
    }

    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "completed": t.completed,
            "assignee_id": t.assignee_id,
            "assignee_name": user_map.get(t.assignee_id, "Unassigned") if t.assignee_id else "Unassigned",
            "priority": t.priority,
            "due_date": t.due_date,    
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        }
        for t in rows
    ]
    

@app.post("/tasks", status_code=201)
def create_task(payload: TaskCreate):
    """Creates a new task and assing it to the requested user when a POST request send to /tasks endpoint"""
    
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    if not user_exists(payload.assignee_id):
        raise HTTPException(status_code=400, detail="assignee_id is invalid")

    priority = validate_priority(payload.priority)

    with Session(db_engine) as session:
        task = Task(
            title=title,
            description=(payload.description or "").strip(),
            assignee_id=payload.assignee_id,
            priority=priority,
            due_date=payload.due_date,
        )
        session.add(task)
        session.commit()
        session.refresh(task)

    return {"id": task.id}


@app.patch("/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate):
    """Partially updates the requested task when a PATCH request send to /tasks/{task_id} endpoint"""
    
    with Session(db_engine) as session:
        task = session.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if payload.title is not None:
            title = payload.title.strip()
            if not title:
                raise HTTPException(status_code=400, detail="title cannot be empty")
            task.title = title

        if payload.description is not None:
            task.description = payload.description.strip()

        if payload.assignee_id is not None:
            if not user_exists(payload.assignee_id):
                raise HTTPException(status_code=400, detail="assignee_id is invalid")
            task.assignee_id = payload.assignee_id

        if payload.completed is not None:
            task.completed = payload.completed

        if payload.priority is not None:
            task.priority = validate_priority(payload.priority)

        if payload.due_date is not None:
            task.due_date = payload.due_date

        task.updated_at = datetime.now(tz=timezone.utc)
        
        session.add(task)
        session.commit()
        session.refresh(task)

    return {"ok": True}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    """Deletes the requested task from database when a DELETE request send to /tasks/{task_id} endpoint"""
    
    with Session(db_engine) as session:
        task = session.get(Task, task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        session.delete(task)
        session.commit()
    
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
