const taskForm = document.querySelector("#taskForm");
const titleInput = document.querySelector("#titleInput");
const descriptionInput = document.querySelector("#descriptionInput");
const priorityInput = document.querySelector("#priorityInput");
const dueDateInput = document.querySelector("#dueDateInput");
const searchInput = document.querySelector("#searchInput");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const filterButtons = document.querySelectorAll(".segment");

const dashboard = {
  totalCount: document.querySelector("#totalCount"),
  doneCount: document.querySelector("#doneCount"),
  pendingCount: document.querySelector("#pendingCount"),
  highCount: document.querySelector("#highCount"),
  totalHint: document.querySelector("#totalHint"),
  doneHint: document.querySelector("#doneHint"),
  pendingHint: document.querySelector("#pendingHint"),
  highHint: document.querySelector("#highHint"),
  visibleCount: document.querySelector("#visibleCount"),
  progressLabel: document.querySelector("#progressLabel"),
  completionRate: document.querySelector("#completionRate"),
  progressBar: document.querySelector("#progressBar"),
  highBreakdown: document.querySelector("#highBreakdown"),
  mediumBreakdown: document.querySelector("#mediumBreakdown"),
  lowBreakdown: document.querySelector("#lowBreakdown"),
  nextDueTitle: document.querySelector("#nextDueTitle"),
  nextDueMeta: document.querySelector("#nextDueMeta"),
};

let activeFilter = "all";
let tasks = [];

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function visibleTasks() {
  const query = searchInput.value.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "completed" && task.completed) ||
      (activeFilter === "pending" && !task.completed);
    const matchesSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
}

function sortedTasks(items) {
  const priorityRank = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    const aDate = parseDate(a.due_date);
    const bDate = parseDate(b.due_date);
    if (aDate && bDate) return aDate - bDate;
    if (aDate) return -1;
    if (bDate) return 1;
    return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
  });
}

function setActiveFilter(filter) {
  activeFilter = filter;
  filterButtons.forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === filter);
  });
}

function updateDashboard(filtered) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const high = tasks.filter((task) => task.priority === "high" && !task.completed).length;
  const medium = tasks.filter((task) => task.priority === "medium" && !task.completed).length;
  const low = tasks.filter((task) => task.priority === "low" && !task.completed).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  const nextDue = sortedTasks(tasks.filter((task) => !task.completed && parseDate(task.due_date)))[0];

  dashboard.totalCount.textContent = total;
  dashboard.doneCount.textContent = completed;
  dashboard.pendingCount.textContent = pending;
  dashboard.highCount.textContent = high;
  dashboard.visibleCount.textContent = `${filtered.length} shown`;
  dashboard.progressLabel.textContent = `${rate}%`;
  dashboard.completionRate.textContent = `${rate}%`;
  dashboard.progressBar.style.width = `${rate}%`;
  dashboard.highBreakdown.textContent = high;
  dashboard.mediumBreakdown.textContent = medium;
  dashboard.lowBreakdown.textContent = low;

  dashboard.totalHint.textContent = total === 1 ? "1 item in the workspace" : `${total} items in the workspace`;
  dashboard.doneHint.textContent = completed === 1 ? "1 task closed" : `${completed} tasks closed`;
  dashboard.pendingHint.textContent = pending === 1 ? "1 task needs action" : `${pending} tasks need action`;
  dashboard.highHint.textContent = high === 1 ? "1 urgent item open" : `${high} urgent items open`;

  if (nextDue) {
    dashboard.nextDueTitle.textContent = nextDue.title;
    dashboard.nextDueMeta.textContent = `${formatDate(nextDue.due_date)} · ${nextDue.priority} priority`;
  } else {
    dashboard.nextDueTitle.textContent = "Nothing scheduled";
    dashboard.nextDueMeta.textContent = "Add due dates to build a timeline.";
  }
}

function renderTasks() {
  const filtered = sortedTasks(visibleTasks());
  taskList.innerHTML = "";
  emptyState.classList.toggle("visible", filtered.length === 0);
  updateDashboard(filtered);

  filtered.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;
    item.dataset.priority = task.priority;

    item.innerHTML = `
      <button class="check-button ${task.completed ? "done" : ""}" type="button" aria-label="${task.completed ? "Mark pending" : "Mark complete"}">
        ${task.completed ? "✓" : ""}
      </button>
      <div class="task-content">
        <p class="task-title"></p>
        <p class="task-description"></p>
        <div class="meta">
          <span class="pill"></span>
          <span class="pill"></span>
        </div>
      </div>
      <button class="delete-button" type="button" aria-label="Delete task">×</button>
    `;

    item.querySelector(".task-title").textContent = task.title;
    item.querySelector(".task-description").textContent = task.description || "No details added.";
    const pills = item.querySelectorAll(".pill");
    pills[0].textContent = `${task.priority} priority`;
    pills[1].textContent = formatDate(task.due_date);
    item.querySelector(".check-button").addEventListener("click", () => toggleTask(task));
    item.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));
    taskList.appendChild(item);
  });
}

async function loadTasks() {
  const response = await fetch("/api/tasks");
  tasks = await response.json();
  renderTasks();
}

async function createTask(event) {
  event.preventDefault();
  const payload = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    priority: priorityInput.value,
    due_date: dueDateInput.value,
  };

  if (!payload.title) return;

  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    taskForm.reset();
    priorityInput.value = "medium";
    setActiveFilter("all");
    titleInput.focus();
    await loadTasks();
  }
}

async function toggleTask(task) {
  await fetch(`/api/tasks/${task.id}/complete`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: !task.completed }),
  });
  await loadTasks();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  await loadTasks();
}

taskForm.addEventListener("submit", createTask);
searchInput.addEventListener("input", renderTasks);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveFilter(button.dataset.filter);
    renderTasks();
  });
});

loadTasks();
