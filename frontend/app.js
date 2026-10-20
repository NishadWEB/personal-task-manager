const API_URL = "https://personal-task-manager-b1nz.onrender.com/api";

let accessToken = null;
let currentPage = 1;
let nextPageUrl = null;
let previousPageUrl = null;
let editingTaskId = null;

const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const taskForm = document.getElementById("task-form");

const authMessage = document.getElementById("auth-message");
const taskMessage = document.getElementById("task-message");
const taskList = document.getElementById("task-list");

const searchInput = document.getElementById("search-input");
const filterStatus = document.getElementById("filter-status");
const filterPriority = document.getElementById("filter-priority");

searchInput.value = ""
filterStatus.value = ""
filterPriority.value = ""

function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.color = isError ? "#a00020" : "#800020";
}

async function apiRequest(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = (typeof data.detail === "string" ? data.detail : "Something went wrong.");

        if (response.status === 401 && accessToken) {
            logout();
        }

        throw new Error(message);
    }

    return data;
}

// Registration
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);

    const payload = {
        'username': formData.get("username").trim(),
        'email': formData.get("email").trim(),
        'password': formData.get("password"),
    };

    try {
        await apiRequest(`${API_URL}/register/`, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        registerForm.reset();

        showMessage(
            authMessage,
            "Account created successfully. You can now log in."
        );
    } catch (error) {
        showMessage(authMessage, error.message, true);
    }
});

// Login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);

    try {
        const tokens = await apiRequest(`${API_URL}/token/`, {
            method: "POST",
            body: JSON.stringify({
                'username': formData.get("username").trim(),
                'password': formData.get("password"),
            }),
        });

        accessToken = tokens.access;
        loginForm.reset();

        authSection.hidden = true;
        dashboardSection.hidden = false;

        showMessage(authMessage, "");
        await refreshDashboard();
    } catch (error) {
        showMessage(authMessage, error.message, true);
    }
});

// Logout
document.getElementById("logout-button").addEventListener("click", logout);

function logout() {
    accessToken = null;
    editingTaskId = null;
    currentPage = 1;

    dashboardSection.hidden = true;
    authSection.hidden = false;

    searchInput.value = ""
    filterStatus.value = ""
    filterPriority.value = ""

    resetTaskForm();
    showMessage(authMessage, "You have been logged out.");
}

// Dashboard statistics
async function loadStats() {
    const stats = await apiRequest(`${API_URL}/tasks/stats/`);

    document.getElementById("total-count").textContent = stats.total;
    document.getElementById("pending-count").textContent = stats.pending;
    document.getElementById("in-progress-count").textContent = stats.in_progress;
    document.getElementById("completed-count").textContent = stats.completed;
}

// Load tasks
async function loadTasks(url = null) {
    const params = new URLSearchParams();

    if (searchInput.value.trim()) {
        params.set("search", searchInput.value.trim());
    }

    if (filterStatus.value) {
        params.set("status", filterStatus.value);
    }

    if (filterPriority.value) {
        params.set("priority", filterPriority.value);
    }

    const requestUrl = url || `${API_URL}/tasks/?${params.toString()}`;

    taskList.replaceChildren();

    const loading = document.createElement("p");
    loading.textContent = "Loading tasks...";
    taskList.appendChild(loading);

    try {
        const data = await apiRequest(requestUrl);

        taskList.replaceChildren();

        nextPageUrl = data.next;
        previousPageUrl = data.previous;

        const currentUrl = new URL(requestUrl, window.location.origin);
        currentPage = Number(currentUrl.searchParams.get("page") || 1);

        document.getElementById("page-info").textContent = `Page ${currentPage}`;

        document.getElementById("previous-page").disabled = !previousPageUrl;

        document.getElementById("next-page").disabled = !nextPageUrl;

        if (data.results.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent = "No tasks found. Create your first task!";
            taskList.appendChild(empty);
            return;
        }

        data.results.forEach(renderTask);
    } catch (error) {
        taskList.replaceChildren();

        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = error.message;
        taskList.appendChild(message);
    }
}

// Render one task safely
function renderTask(task) {
    const card = document.createElement("article");
    card.className = "task-item";

    const title = document.createElement("h3");
    title.textContent = task.title;
    card.appendChild(title);

    const description = document.createElement("p");
    description.textContent = task.description || "No description";
    card.appendChild(description);

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const statusBadge = document.createElement("span");
    statusBadge.className = "badge";
    statusBadge.textContent = task.status.replaceAll("_", " ");

    const priorityBadge = document.createElement("span");
    priorityBadge.className = "badge";
    priorityBadge.textContent = `${task.priority} priority`;

    meta.append(statusBadge, priorityBadge);
    card.appendChild(meta);

    const dueDate = document.createElement("p");
    dueDate.textContent = `Due date: ${task.due_date || "Not set"}`;
    card.appendChild(dueDate);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => startEditing(task));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(editButton, deleteButton);
    card.appendChild(actions);

    taskList.appendChild(card);
}

// Create or update task
taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(taskForm);

    const payload = {
        title: formData.get("title").trim(),
        description: formData.get("description").trim(),
        status: formData.get("status"),
        priority: formData.get("priority"),
        due_date: formData.get("due_date") || null,
    };

    const isEditing = editingTaskId !== null;

    const url = isEditing
        ? `${API_URL}/tasks/${editingTaskId}/`
        : `${API_URL}/tasks/`;

    try {
        await apiRequest(url, {
            method: isEditing ? "PATCH" : "POST",
            body: JSON.stringify(payload),
        });

        resetTaskForm();
        showMessage(
            taskMessage,
            isEditing ? "Task updated successfully." : "Task created successfully."
        );

        await refreshDashboard();
    } catch (error) {
        showMessage(taskMessage, error.message, true);
    }
});

// Prepare task form for editing
function startEditing(task) {
    editingTaskId = task.id;

    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("task-status").value = task.status;
    document.getElementById("task-priority").value = task.priority;
    document.getElementById("task-due-date").value = task.due_date || "";

    document.getElementById("task-form-heading").textContent = "Edit task";
    document.getElementById("save-task-button").textContent = "Save Changes";
    document.getElementById("cancel-edit-button").hidden = false;

    taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Reset task form
function resetTaskForm() {
    editingTaskId = null;
    taskForm.reset();

    document.getElementById("task-form-heading").textContent = "Create a task";
    document.getElementById("save-task-button").textContent = "Create Task";
    document.getElementById("cancel-edit-button").hidden = true;
}

document.getElementById("cancel-edit-button").addEventListener("click", () => {
    resetTaskForm();
    showMessage(taskMessage, "");
});

// Delete task
async function deleteTask(taskId) {
    if (!window.confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {
        await apiRequest(`${API_URL}/tasks/${taskId}/`, {
            method: "DELETE",
        });

        showMessage(taskMessage, "Task deleted successfully.");
        await refreshDashboard();
    } catch (error) {
        showMessage(taskMessage, error.message, true);
    }
}

// Search and filtering
let searchTimer;

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        currentPage = 1;
        loadTasks();
    }, 300);
});

filterStatus.addEventListener("change", () => {
    currentPage = 1;
    loadTasks();
});

filterPriority.addEventListener("change", () => {
    currentPage = 1;
    loadTasks();
});

// Pagination
document.getElementById("previous-page").addEventListener("click", () => {
    if (previousPageUrl) {
        loadTasks(previousPageUrl);
    }
});

document.getElementById("next-page").addEventListener("click", () => {
    if (nextPageUrl) {
        loadTasks(nextPageUrl);
    }
});

// Refresh dashboard after task changes
async function refreshDashboard() {
    await loadStats();
    await loadTasks();
}
