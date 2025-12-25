export type User = { id: number; name: string };

export type Task = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  assignee_id: number | null;
  assignee_name: string;
  priority: "low" | "medium" | "high";
  due_date: string | null; // ISO date "YYYY-MM-DD" from backend
};
