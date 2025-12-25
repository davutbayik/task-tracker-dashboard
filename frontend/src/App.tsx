import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { Task, User } from "./types";

type StatusFilter = "all" | "complete" | "incomplete";
type Priority = "low" | "medium" | "high";
type PriorityFilter = Priority | "all";
type DueFilter = "all" | "overdue" | "today" | "upcoming";

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState<string>("");

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<number | "">("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState<number | "">("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editDueDate, setEditDueDate] = useState<string>("");

  // today for date min (no past dates)
  const today = new Date().toISOString().slice(0, 10);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (assigneeFilter !== "") params.set("assignee_id", String(assigneeFilter));
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (dueFilter !== "all") params.set("due", dueFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [search, status, assigneeFilter, priorityFilter, dueFilter]);

  async function load() {
    const [u, t] = await Promise.all([
      api<User[]>("/users"),
      api<Task[]>(`/tasks${queryString}`),
    ]);
    setUsers(u);
    setTasks(t);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    await api<{ id: number }>("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: t,
        description,
        assignee_id: assigneeId === "" ? null : assigneeId,
        priority,
        due_date: dueDate || null,
      }),
    });

    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("medium");
    setDueDate("");
    await load();
  }

  async function toggleComplete(task: Task) {
    // optimistic
    setTasks((prev) =>
      prev.map((x) => (x.id === task.id ? { ...x, completed: !x.completed } : x))
    );

    try {
      await api<{ ok: true }>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      await load();
    } catch {
      // revert
      setTasks((prev) =>
        prev.map((x) => (x.id === task.id ? { ...x, completed: task.completed } : x))
      );
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditAssigneeId(task.assignee_id ?? "");
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ?? "");
  }

  async function saveEdit(id: number) {
    const t = editTitle.trim();
    if (!t) return;

    await api<{ ok: true }>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: t,
        description: editDescription,
        assignee_id: editAssigneeId === "" ? null : editAssigneeId,
        priority: editPriority,
        due_date: editDueDate || null,
      }),
    });

    setEditingId(null);
    await load();
  }

  async function quickAssign(task: Task, newAssigneeId: number | "") {
    await api<{ ok: true }>(`/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ assignee_id: newAssigneeId === "" ? null : newAssigneeId }),
    });
    await load();
  }

  async function removeTask(taskId: number) {
    await api<{ ok: true }>(`/tasks/${taskId}`, { method: "DELETE" });
    await load();
  }

  function renderPriorityBadge(p: Priority) {
    const base =
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium";
    if (p === "high") {
      return (
        <span className={`${base} border-rose-500/60 bg-rose-500/10 text-rose-200`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
          High priority
        </span>
      );
    }
    if (p === "low") {
      return (
        <span className={`${base} border-slate-500/60 bg-slate-500/10 text-slate-200`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
          Low priority
        </span>
      );
    }
    return (
      <span className={`${base} border-amber-500/60 bg-amber-500/10 text-amber-200`}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        Medium priority
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* BRAND BAR */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-xs font-bold text-white shadow shadow-sky-500/40">
              ST
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">Spark Tutoring</div>
              <div className="text-[11px] text-slate-400">
                Internal team task board
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-slate-400 sm:flex">
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
              Full-stack preview build
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        {/* LEFT COLUMN – header + create form */}
        <div className="w-full space-y-6 lg:w-2/5">
          {/* HEADER */}
          <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Live team board
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                  Team Task Tracker
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Create, assign, filter, prioritize and track due dates of tasks.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-right">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Total tasks
                  </div>
                  <div className="text-xl font-semibold text-slate-50">
                    {tasks.length}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* CREATE TASK */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/40 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  New Task
                </h2>
                <p className="text-xs text-slate-500">
                  Title, assignee, priority, due date and description.
                </p>
              </div>
            </div>

            <form onSubmit={createTask} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Title</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Prepare Monday tutoring schedule"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Assignee
                  </label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                    value={assigneeId}
                    onChange={(e) =>
                      setAssigneeId(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Priority
                  </label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Due date</label>
                <input
                  type="date"
                  lang="en" // date picker language hint
                  min={today} // no past dates
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">
                  Description <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context, links, or notes for the assignee."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-sky-500/40 transition-colors hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                >
                  <span>+ Add task</span>
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600/60"
                  onClick={() => {
                    setTitle("");
                    setDescription("");
                    setAssigneeId("");
                    setPriority("medium");
                    setDueDate("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* RIGHT COLUMN – filters + task list */}
        <section className="w-full space-y-4 lg:w-3/5">
          {/* FILTERS */}
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-md shadow-slate-950/40">
              <label className="text-xs font-medium text-slate-300">Search</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title or description…"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-md shadow-slate-950/40">
              <label className="text-xs font-medium text-slate-300">Status</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-md shadow-slate-950/40">
              <label className="text-xs font-medium text-slate-300">Assignee</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                value={assigneeFilter}
                onChange={(e) =>
                  setAssigneeFilter(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="">All</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-md shadow-slate-950/40 space-y-2">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Priority filter
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                  value={priorityFilter}
                  onChange={(e) =>
                    setPriorityFilter(e.target.value as PriorityFilter)
                  }
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Due date filter
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                  value={dueFilter}
                  onChange={(e) => setDueFilter(e.target.value as DueFilter)}
                >
                  <option value="all">All</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due today</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>
          </section>

          {/* TASK LIST */}
          <section className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/40 backdrop-blur"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* LEFT: title, description, assignee */}
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-50">
                        {editingId === t.id ? (
                          <input
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        ) : (
                          t.title
                        )}
                      </h3>

                      {t.completed ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Incomplete
                        </span>
                      )}

                      {renderPriorityBadge(t.priority)}
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
                      {t.due_date && (
                        <span>
                          Due:{" "}
                          <span className="font-medium text-slate-200">
                            {t.due_date}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-slate-200">
                      {editingId === t.id ? (
                        <textarea
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                          rows={3}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      ) : t.description ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {t.description}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500 italic">
                          No description provided.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-medium text-slate-300">Assignee:</span>

                      {editingId === t.id ? (
                        <select
                          className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                          value={editAssigneeId}
                          onChange={(e) =>
                            setEditAssigneeId(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                          value={t.assignee_id ?? ""}
                          onChange={(e) =>
                            quickAssign(
                              t,
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <span className="ml-2 text-[11px] text-slate-500">
                        ({t.assignee_name})
                      </span>
                    </div>

                    {editingId === t.id && (
                      <div className="mt-3 grid gap-3 text-xs text-slate-300 md:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-medium">
                            Priority
                          </label>
                          <select
                            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                            value={editPriority}
                            onChange={(e) =>
                              setEditPriority(e.target.value as Priority)
                            }
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium">
                            Due date
                          </label>
                          <input
                            type="date"
                            lang="en"
                            min={today}
                            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-colors"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: action buttons */}
                  <div className="flex shrink-0 flex-row gap-2 md:flex-col md:items-end">
                    <button
                      type="button"
                      className="cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      onClick={() => toggleComplete(t)}
                    >
                      Toggle status
                    </button>

                    {editingId === t.id ? (
                      <>
                        <button
                          type="button"
                          className="cursor-pointer rounded-xl bg-sky-500 px-4 py-2 text-xs font-medium text-white shadow-md shadow-sky-500/40 transition-colors hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                          onClick={() => saveEdit(t.id)}
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600/70"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                          onClick={() => startEdit(t)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer rounded-xl border border-rose-600/70 bg-rose-600/10 px-4 py-2 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-600/20 focus:outline-none focus:ring-2 focus:ring-rose-500/60"
                          onClick={() => removeTask(t.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-sm text-slate-400 shadow-md shadow-slate-950/40">
                No tasks match the current filters. Try clearing search or status.
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}