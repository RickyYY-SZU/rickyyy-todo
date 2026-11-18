const state = {
  todos: [],
  view: "all",
  category: null,
  priority: "all",
  query: "",
  sort: "smart",
  editingId: null,
  deleteId: null,
  importedTodos: [],
  loading: true
};

const viewCopy = {
  all: { title: "全部任务", emptyTitle: "清单还是空的", emptyText: "给今天写下一件值得完成的小事吧。" },
  today: { title: "今天", emptyTitle: "今天没有待办", emptyText: "留一点空白，也是一种安排。" },
  upcoming: { title: "接下来", emptyTitle: "接下来很轻松", emptyText: "还没有安排未来日期的任务。" },
  completed: { title: "已完成", emptyTitle: "还没有完成记录", emptyText: "完成第一件事后，它会出现在这里。" }
};

const priorityCopy = { high: "高优先级", medium: "普通", low: "低优先级" };
const categoryCopy = { work: "工作", personal: "生活", study: "学习" };
const priorityWeight = { high: 0, medium: 1, low: 2 };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  loginView: $("#loginView"),
  appShell: $("#appShell"),
  loginForm: $("#loginForm"),
  password: $("#password"),
  togglePassword: $("#togglePassword"),
  loginError: $("#loginError"),
  todayLabel: $("#todayLabel"),
  greeting: $("#greeting"),
  taskList: $("#taskList"),
  emptyState: $("#emptyState"),
  emptyTitle: $("#emptyTitle"),
  emptyText: $("#emptyText"),
  viewTitle: $("#viewTitle"),
  taskTotal: $("#taskTotal"),
  allCount: $("#allCount"),
  todayCount: $("#todayCount"),
  completedCount: $("#completedCount"),
  workCount: $("#workCount"),
  personalCount: $("#personalCount"),
  studyCount: $("#studyCount"),
  progressValue: $("#progressCircle"),
  progressPercent: $("#progressPercent"),
  heroTitle: $("#heroTitle"),
  heroSubtitle: $("#heroSubtitle"),
  searchInput: $("#searchInput"),
  sortSelect: $("#sortSelect"),
  dialog: $("#taskDialog"),
  taskForm: $("#taskForm"),
  taskId: $("#taskId"),
  taskTitle: $("#taskTitle"),
  taskNotes: $("#taskNotes"),
  taskDueDate: $("#taskDueDate"),
  taskCategory: $("#taskCategory"),
  taskError: $("#taskError"),
  dialogEyebrow: $("#dialogEyebrow"),
  dialogTitle: $("#dialogTitle"),
  saveTaskButton: $("#saveTaskButton"),
  importDialog: $("#importDialog"),
  importInputStage: $("#importInputStage"),
  importPreviewStage: $("#importPreviewStage"),
  importText: $("#importText"),
  importCounter: $("#importCounter"),
  importError: $("#importError"),
  importSaveError: $("#importSaveError"),
  analyzeImport: $("#analyzeImport"),
  importPreviewList: $("#importPreviewList"),
  importResultCount: $("#importResultCount"),
  confirmImport: $("#confirmImport"),
  deleteSheet: $("#deleteSheet"),
  toastRegion: $("#toastRegion"),
  cloudStatus: $("#cloudStatus"),
  sidebar: $("#sidebar"),
  sidebarScrim: $("#sidebarScrim")
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDateLabel(dateKey) {
  const due = dateFromKey(dateKey);
  if (!due) return "";
  const today = dateFromKey(localDateKey());
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  if (dateKey === localDateKey(today)) return "今天";
  if (dateKey === localDateKey(tomorrow)) return "明天";
  if (dateKey === localDateKey(yesterday)) return "昨天";

  const difference = Math.round((due - today) / 86400000);
  if (difference < 0) return `逾期 ${Math.abs(difference)} 天`;
  if (difference < 7) {
    return due.toLocaleDateString("zh-CN", { weekday: "short" });
  }
  return due.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function isoDateIsToday(isoString) {
  if (!isoString) return false;
  return localDateKey(new Date(isoString)) === localDateKey();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers
  });

  if (response.status === 401) {
    showLogin();
    throw new Error("登录状态已失效，请重新登录");
  }
  if (!response.ok) {
    let message = "操作没有完成，请稍后再试";
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // Keep the fallback message for non-JSON errors.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function setCloudStatus(status) {
  elements.cloudStatus.classList.toggle("is-saving", status === "saving");
  elements.cloudStatus.classList.toggle("is-error", status === "error");
  elements.cloudStatus.textContent =
    status === "saving" ? "正在同步…" : status === "error" ? "同步失败" : "数据已同步";
}

function showToast(message, type = "success", action = null) {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " is-error" : ""}`;
  toast.textContent = message;
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      action.run();
      toast.remove();
    });
    toast.append(button);
  }
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), action ? 6000 : 3400);
}

function setTodayCopy() {
  const now = new Date();
  const hour = now.getHours();
  const dateText = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  });
  elements.todayLabel.textContent = dateText;
  elements.greeting.textContent =
    hour < 18 ? "RUN INTO THE NIGHT" : "NIGHT RUN · YOASOBI";
}

function getVisibleTodos() {
  const todayKey = localDateKey();
  let todos = [...state.todos];

  if (state.view === "today") {
    todos = todos.filter((todo) => !todo.completed && todo.dueDate && todo.dueDate <= todayKey);
  } else if (state.view === "upcoming") {
    todos = todos.filter((todo) => !todo.completed && todo.dueDate && todo.dueDate > todayKey);
  } else if (state.view === "completed") {
    todos = todos.filter((todo) => todo.completed);
  }

  if (state.category) todos = todos.filter((todo) => todo.category === state.category);
  if (state.priority !== "all") todos = todos.filter((todo) => todo.priority === state.priority);
  if (state.query) {
    const query = state.query.toLocaleLowerCase();
    todos = todos.filter(
      (todo) =>
        todo.title.toLocaleLowerCase().includes(query) ||
        todo.notes.toLocaleLowerCase().includes(query)
    );
  }

  if (state.sort === "due") {
    todos.sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      if (!a.dueDate && !b.dueDate) return b.createdAt.localeCompare(a.createdAt);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  } else if (state.sort === "created") {
    todos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    todos.sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      const priorityDifference = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (priorityDifference) return priorityDifference;
      if (!a.dueDate && !b.dueDate) return b.createdAt.localeCompare(a.createdAt);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate) || b.createdAt.localeCompare(a.createdAt);
    });
  }

  return todos;
}

function updateCounts() {
  const todayKey = localDateKey();
  const open = state.todos.filter((todo) => !todo.completed);
  const today = open.filter((todo) => todo.dueDate && todo.dueDate <= todayKey);
  const completed = state.todos.filter((todo) => todo.completed);
  elements.allCount.textContent = open.length;
  elements.todayCount.textContent = today.length;
  elements.completedCount.textContent = completed.length;
  elements.workCount.textContent = open.filter((todo) => todo.category === "work").length;
  elements.personalCount.textContent = open.filter((todo) => todo.category === "personal").length;
  elements.studyCount.textContent = open.filter((todo) => todo.category === "study").length;
}

function updateProgress() {
  const today = localDateKey();
  const dailyTasks = state.todos.filter(
    (todo) =>
      (!todo.completed && todo.dueDate && todo.dueDate <= today) ||
      (todo.completed && isoDateIsToday(todo.completedAt))
  );
  const completed = dailyTasks.filter((todo) => todo.completed).length;
  const percentage = dailyTasks.length ? Math.round((completed / dailyTasks.length) * 100) : 0;
  const circumference = 2 * Math.PI * 50;
  elements.progressValue.style.strokeDashoffset = String(
    circumference - (percentage / 100) * circumference
  );
  elements.progressPercent.textContent = `${percentage}%`;
  elements.heroTitle.textContent = "二人だけの空が広がる夜に。";

  if (percentage === 100 && dailyTasks.length) {
    elements.heroSubtitle.textContent = "今晚的清单已经完成，在只属于你的夜空里，把时间留给自己。";
  } else if (percentage >= 50) {
    elements.heroSubtitle.textContent = "在只属于两人的天空铺展开的夜里，继续完成接下来的心愿。";
  } else {
    elements.heroSubtitle.textContent = "像沉入夜色，又如渐渐融化；今晚从清单里挑一件开始。";
  }
}

function taskCardTemplate(todo) {
  const today = localDateKey();
  const overdue = todo.dueDate && todo.dueDate < today && !todo.completed;
  const dueLabel = todo.dueDate ? formatDateLabel(todo.dueDate) : "无截止日期";
  const notes = todo.notes ? `<p class="task-notes">${escapeHtml(todo.notes)}</p>` : "";
  const createdAt = new Date(todo.createdAt).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric"
  });

  return `
    <article class="task-card${todo.completed ? " is-completed" : ""}" data-id="${todo.id}">
      <button class="task-check" type="button" data-action="toggle" aria-label="${
        todo.completed ? "标记为未完成" : "标记为完成"
      }" aria-pressed="${todo.completed}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4L19 7" /></svg>
      </button>
      <div class="task-body">
        <div class="task-title-line">
          <h4 class="task-title">${escapeHtml(todo.title)}</h4>
        </div>
        ${notes}
        <div class="task-meta">
          <span class="task-due${overdue ? " is-overdue" : ""}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
            ${dueLabel}
          </span>
          <span class="task-priority ${todo.priority}">
            <i class="priority-dot ${todo.priority}"></i>${priorityCopy[todo.priority]}
          </span>
          <span>
            <i class="category-dot category-${todo.category}"></i>${categoryCopy[todo.category]}
          </span>
          <span class="task-created">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></svg>
            ${createdAt}
          </span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-button edit-action" type="button" data-action="edit" aria-label="编辑任务">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5 3 3M5 19l3.7-.8L18.4 8.5a2.1 2.1 0 0 0-3-3L5.8 15.2 5 19Z" /></svg>
        </button>
        <button class="icon-button delete-action" type="button" data-action="delete" aria-label="删除任务">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
        </button>
      </div>
    </article>
  `;
}

function render() {
  const visible = getVisibleTodos();
  updateCounts();
  updateProgress();

  const copy = viewCopy[state.view];
  elements.viewTitle.textContent = state.category
    ? `${categoryCopy[state.category]} · ${copy.title}`
    : copy.title;
  elements.taskTotal.textContent = `${visible.length} 项任务`;

  if (state.loading) {
    elements.taskList.innerHTML = "";
    elements.emptyState.classList.add("is-hidden");
    return;
  }

  elements.taskList.innerHTML = visible.map(taskCardTemplate).join("");
  const isEmpty = visible.length === 0;
  elements.emptyState.classList.toggle("is-hidden", !isEmpty);

  if (isEmpty) {
    if (state.query) {
      elements.emptyTitle.textContent = "没有找到相关任务";
      elements.emptyText.textContent = `试试换一个关键词，或者清除“${state.query}”`;
    } else if (state.priority !== "all") {
      elements.emptyTitle.textContent = "这个筛选下没有任务";
      elements.emptyText.textContent = "换一个优先级，或者添加一条新任务。";
    } else {
      elements.emptyTitle.textContent = copy.emptyTitle;
      elements.emptyText.textContent = copy.emptyText;
    }
  }
}

async function loadTodos() {
  state.loading = true;
  render();
  setCloudStatus("saving");
  try {
    const data = await api("/api/todos");
    state.todos = data.todos;
    setCloudStatus("saved");
  } catch (error) {
    setCloudStatus("error");
    showToast(error.message, "error");
  } finally {
    state.loading = false;
    render();
  }
}

function showApp() {
  elements.loginView.classList.add("is-hidden");
  elements.appShell.classList.remove("is-hidden");
}

function showLogin() {
  elements.appShell.classList.add("is-hidden");
  elements.loginView.classList.remove("is-hidden");
  elements.password.value = "";
  elements.loginError.textContent = "";
  window.setTimeout(() => elements.password.focus(), 60);
}

async function checkSession() {
  try {
    const data = await fetch("/api/session", { credentials: "same-origin" }).then((response) =>
      response.json()
    );
    if (!data.authenticated) {
      showLogin();
      return;
    }
    showApp();
    await loadTodos();
  } catch {
    showLogin();
  }
}

function openTaskDialog(todo = null) {
  state.editingId = todo?.id || null;
  elements.taskForm.reset();
  elements.taskId.value = todo?.id || "";
  elements.taskTitle.value = todo?.title || "";
  elements.taskNotes.value = todo?.notes || "";
  elements.taskDueDate.value = todo?.dueDate || localDateKey();
  elements.taskCategory.value = todo?.category || "personal";
  const priority = todo?.priority || "medium";
  const priorityInput = elements.taskForm.querySelector(`[name="priority"][value="${priority}"]`);
  if (priorityInput) priorityInput.checked = true;

  elements.dialogEyebrow.textContent = todo ? "EDIT TASK" : "NEW TASK";
  elements.dialogTitle.textContent = todo ? "编辑这件小事" : "添加一件小事";
  elements.saveTaskButton.textContent = todo ? "保存修改" : "保存任务";
  elements.taskError.textContent = "";
  if (!elements.dialog.open) elements.dialog.showModal();
  window.setTimeout(() => elements.taskTitle.focus(), 50);
}

function closeTaskDialog() {
  elements.dialog.close();
  elements.taskError.textContent = "";
  state.editingId = null;
}

function openImportDialog() {
  if (elements.dialog.open) closeTaskDialog();
  elements.importInputStage.classList.remove("is-hidden");
  elements.importPreviewStage.classList.add("is-hidden");
  elements.importError.textContent = "";
  elements.importSaveError.textContent = "";
  elements.importText.value = "";
  elements.importCounter.textContent = "0";
  elements.importPreviewList.innerHTML = "";
  state.importedTodos = [];
  if (!elements.importDialog.open) elements.importDialog.showModal();
  window.setTimeout(() => elements.importText.focus(), 60);
}

function closeImportDialog() {
  elements.importDialog.close();
  elements.importError.textContent = "";
  elements.importSaveError.textContent = "";
}

function renderImportPreview() {
  const todos = state.importedTodos;
  elements.importResultCount.textContent = String(todos.length);
  if (!todos.length) {
    elements.importPreviewList.innerHTML =
      '<div class="import-empty">没有找到明确可执行的待办。请返回补充更具体的行动、时间或负责人。</div>';
  } else {
    elements.importPreviewList.innerHTML = todos
      .map(
        (todo, index) => `
          <label class="import-preview-item">
            <input type="checkbox" data-index="${index}" checked aria-label="导入第 ${index + 1} 条任务" />
            <span class="import-preview-copy">
              <strong>${escapeHtml(todo.title)}</strong>
              ${todo.notes ? `<p>${escapeHtml(todo.notes)}</p>` : ""}
              <span class="import-preview-meta">
                ${
                  todo.dueDate
                    ? `<span>${escapeHtml(formatDateLabel(todo.dueDate))}</span>`
                    : "<span>无截止日期</span>"
                }
                <span><i class="priority-dot ${todo.priority}"></i>${priorityCopy[todo.priority]}</span>
                <span><i class="category-dot category-${todo.category}"></i>${categoryCopy[todo.category]}</span>
              </span>
            </span>
          </label>
        `
      )
      .join("");
  }
  updateImportSelection();
}

function updateImportSelection() {
  const selectedCount = elements.importPreviewList.querySelectorAll('input[type="checkbox"]:checked').length;
  elements.confirmImport.textContent =
    selectedCount > 0 ? `加入清单 (${selectedCount})` : "请选择任务";
  elements.confirmImport.disabled = selectedCount === 0;
}

async function analyzeImport() {
  const text = elements.importText.value.trim();
  elements.importError.textContent = "";
  if (!text) {
    elements.importError.textContent = "请先粘贴需要整理的文本";
    elements.importText.focus();
    return;
  }

  elements.analyzeImport.disabled = true;
  elements.analyzeImport.classList.add("is-loading");
  elements.analyzeImport.querySelector("span:last-child").textContent = "AI 正在整理…";
  setCloudStatus("saving");
  try {
    const result = await api("/api/todos/import", {
      method: "POST",
      body: JSON.stringify({ text })
    });
    state.importedTodos = result.todos;
    setCloudStatus("saved");
    renderImportPreview();
    elements.importInputStage.classList.add("is-hidden");
    elements.importPreviewStage.classList.remove("is-hidden");
  } catch (error) {
    setCloudStatus("error");
    elements.importError.textContent = error.message;
  } finally {
    elements.analyzeImport.disabled = false;
    elements.analyzeImport.classList.remove("is-loading");
    elements.analyzeImport.querySelector("span:last-child").textContent = "交给 AI 整理";
  }
}

async function confirmImport() {
  const selected = [...elements.importPreviewList.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => state.importedTodos[Number(input.dataset.index)])
    .filter(Boolean);
  if (!selected.length) {
    elements.importSaveError.textContent = "请至少选择一条任务";
    return;
  }

  elements.importSaveError.textContent = "";
  elements.confirmImport.disabled = true;
  elements.confirmImport.textContent = "正在导入…";
  setCloudStatus("saving");
  try {
    const result = await api("/api/todos/batch", {
      method: "POST",
      body: JSON.stringify({ todos: selected })
    });
    state.todos.push(...result.todos);
    setCloudStatus("saved");
    closeImportDialog();
    render();
    showToast(`已加入 ${result.todos.length} 条任务`);
  } catch (error) {
    setCloudStatus("error");
    elements.importSaveError.textContent = error.message;
    updateImportSelection();
  }
}

async function saveTask(event) {
  event.preventDefault();
  const title = elements.taskTitle.value.trim();
  if (!title) {
    elements.taskError.textContent = "请先写下任务名称";
    elements.taskTitle.focus();
    return;
  }

  const priority =
    elements.taskForm.querySelector('[name="priority"]:checked')?.value || "medium";
  const body = {
    title,
    notes: elements.taskNotes.value.trim(),
    dueDate: elements.taskDueDate.value,
    category: elements.taskCategory.value,
    priority
  };
  const id = elements.taskId.value;

  elements.saveTaskButton.disabled = true;
  elements.saveTaskButton.textContent = "正在保存…";
  setCloudStatus("saving");
  try {
    const result = await api(id ? `/api/todos/${id}` : "/api/todos", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(body)
    });
    if (id) {
      const index = state.todos.findIndex((todo) => todo.id === id);
      if (index !== -1) state.todos[index] = result.todo;
    } else {
      state.todos.push(result.todo);
    }
    setCloudStatus("saved");
    closeTaskDialog();
    render();
    showToast(id ? "任务已更新" : "任务已加入清单");
  } catch (error) {
    setCloudStatus("error");
    elements.taskError.textContent = error.message;
  } finally {
    elements.saveTaskButton.disabled = false;
    elements.saveTaskButton.textContent = id ? "保存修改" : "保存任务";
  }
}

async function toggleTask(id, button) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  button.classList.add("is-loading");
  setCloudStatus("saving");
  try {
    const result = await api(`/api/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !todo.completed })
    });
    const index = state.todos.findIndex((item) => item.id === id);
    state.todos[index] = result.todo;
    setCloudStatus("saved");
    render();
    if (result.todo.completed) showToast("完成一件，继续向夜晚奔跑");
  } catch (error) {
    setCloudStatus("error");
    showToast(error.message, "error");
    button.classList.remove("is-loading");
  }
}

function confirmDelete(id) {
  state.deleteId = id;
  elements.deleteSheet.classList.remove("is-hidden");
  $("#confirmDelete").focus();
}

async function deleteTask() {
  if (!state.deleteId) return;
  const id = state.deleteId;
  const button = $("#confirmDelete");
  button.disabled = true;
  setCloudStatus("saving");
  try {
    await api(`/api/todos/${id}`, { method: "DELETE" });
    state.todos = state.todos.filter((todo) => todo.id !== id);
    elements.deleteSheet.classList.add("is-hidden");
    state.deleteId = null;
    setCloudStatus("saved");
    render();
    showToast("任务已删除");
  } catch (error) {
    setCloudStatus("error");
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function closeDeleteSheet() {
  elements.deleteSheet.classList.add("is-hidden");
  state.deleteId = null;
}

function setView(view) {
  state.view = view;
  state.category = null;
  $$(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  $$(".category-link").forEach((button) => button.classList.remove("is-active"));
  render();
  closeSidebar();
}

function setCategory(category) {
  state.category = state.category === category ? null : category;
  state.view = "all";
  $$(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === "all");
  });
  $$(".category-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.category === state.category);
  });
  render();
  closeSidebar();
}

function openSidebar() {
  elements.sidebar.classList.add("is-open");
  elements.sidebarScrim.classList.add("is-visible");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  elements.sidebar.classList.remove("is-open");
  elements.sidebarScrim.classList.remove("is-visible");
  document.body.style.overflow = "";
}

async function login(event) {
  event.preventDefault();
  elements.loginError.textContent = "";
  const button = elements.loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.querySelector("span").textContent = "正在进入…";
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: elements.password.value })
    });
    showApp();
    await loadTodos();
  } catch (error) {
    elements.loginError.textContent = error.message;
    elements.password.select();
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "进入我的清单";
  }
}

async function logout() {
  try {
    await api("/api/logout", { method: "POST" });
  } finally {
    state.todos = [];
    showLogin();
  }
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", login);
  elements.togglePassword.addEventListener("click", () => {
    const showing = elements.password.type === "text";
    elements.password.type = showing ? "password" : "text";
    elements.togglePassword.setAttribute("aria-label", showing ? "显示密码" : "隐藏密码");
    elements.password.focus();
  });

  [$("#openTaskModal"), $("#heroAddButton"), $("#emptyAddButton")].forEach((button) => {
    button.addEventListener("click", () => openTaskDialog());
  });
  [$("#openImportDialog"), $("#heroImportButton")].forEach((button) => {
    button.addEventListener("click", openImportDialog);
  });
  elements.taskForm.addEventListener("submit", saveTask);
  $("#closeDialog").addEventListener("click", closeTaskDialog);
  $("#cancelDialog").addEventListener("click", closeTaskDialog);
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeTaskDialog();
  });

  elements.importText.addEventListener("input", () => {
    elements.importCounter.textContent = String(elements.importText.value.length);
  });
  elements.analyzeImport.addEventListener("click", analyzeImport);
  $("#closeImportDialog").addEventListener("click", closeImportDialog);
  $("#cancelImport").addEventListener("click", closeImportDialog);
  $("#backToImport").addEventListener("click", () => {
    elements.importPreviewStage.classList.add("is-hidden");
    elements.importInputStage.classList.remove("is-hidden");
    elements.importText.focus();
  });
  elements.importPreviewList.addEventListener("change", updateImportSelection);
  elements.confirmImport.addEventListener("click", confirmImport);
  elements.importDialog.addEventListener("click", (event) => {
    if (event.target === elements.importDialog) closeImportDialog();
  });

  elements.taskList.addEventListener("click", (event) => {
    const card = event.target.closest(".task-card");
    if (!card) return;
    const action = event.target.closest("[data-action]")?.dataset.action;
    const todo = state.todos.find((item) => item.id === card.dataset.id);
    if (!todo) return;

    if (action === "toggle") toggleTask(todo.id, event.target.closest(".task-check"));
    if (action === "edit") openTaskDialog(todo);
    if (action === "delete") confirmDelete(todo.id);
    if (!action && window.matchMedia("(max-width: 620px)").matches) openTaskDialog(todo);
  });

  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  $$(".category-link").forEach((button) => {
    button.addEventListener("click", () => setCategory(button.dataset.category));
  });
  $$(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.priority = button.dataset.priority;
      $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
      render();
    });
  });

  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value.trim();
    render();
  });
  elements.sortSelect.addEventListener("change", () => {
    state.sort = elements.sortSelect.value;
    render();
  });

  $("#cancelDelete").addEventListener("click", closeDeleteSheet);
  $("#confirmDelete").addEventListener("click", deleteTask);
  elements.deleteSheet.addEventListener("click", (event) => {
    if (event.target === elements.deleteSheet) closeDeleteSheet();
  });
  $("#logoutButton").addEventListener("click", logout);
  $("#mobileLogout").addEventListener("click", () => {
    if (window.confirm("要退出当前清单吗？")) logout();
  });
  $("#sidebarOpen").addEventListener("click", openSidebar);
  $("#sidebarClose").addEventListener("click", closeSidebar);
  elements.sidebarScrim.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if (event.key === "Escape") {
      closeSidebar();
      if (elements.deleteSheet.classList.contains("is-hidden") === false) closeDeleteSheet();
      return;
    }
    if (elements.loginView.classList.contains("is-hidden") === false) return;
    if (event.key.toLowerCase() === "n" && !typing && !elements.dialog.open) {
      event.preventDefault();
      openTaskDialog();
    }
    if (
      event.key.toLowerCase() === "i" &&
      !typing &&
      !elements.dialog.open &&
      !elements.importDialog.open
    ) {
      event.preventDefault();
      openImportDialog();
    }
    if (event.key === "/" && !typing) {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

setTodayCopy();
bindEvents();
checkSession();
