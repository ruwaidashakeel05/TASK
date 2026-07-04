from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, render_template, request


app = Flask(__name__)

DATA_DIR = Path("data")
TASKS_CSV = DATA_DIR / "tasks.csv"
COLUMNS = [
    "id",
    "title",
    "description",
    "completed",
    "priority",
    "due_date",
    "created_at",
    "updated_at",
]


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if pd.isna(value):
        return False
    return str(value).strip().lower() in {"true", "1", "yes", "y"}


def ensure_csv():
    DATA_DIR.mkdir(exist_ok=True)
    if not TASKS_CSV.exists():
        pd.DataFrame(columns=COLUMNS).to_csv(TASKS_CSV, index=False)


def load_tasks():
    ensure_csv()
    df = pd.read_csv(TASKS_CSV)
    for column in COLUMNS:
        if column not in df.columns:
            df[column] = ""
    if not df.empty:
        df["id"] = df["id"].astype(int)
        df["completed"] = df["completed"].apply(parse_bool)
    return df[COLUMNS]


def save_tasks(df):
    ensure_csv()
    df[COLUMNS].to_csv(TASKS_CSV, index=False)


def task_to_dict(row):
    task = {}
    for column in COLUMNS:
        value = row[column]
        if pd.isna(value):
            value = ""
        task[column] = value

    task["id"] = int(task["id"])
    task["completed"] = parse_bool(task["completed"])
    return task


def find_task(df, task_id):
    matches = df.index[df["id"] == task_id].tolist()
    if not matches:
        return None
    return matches[0]


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/health")
def health_check():
    return jsonify({"status": "ok"})


@app.get("/api/tasks")
def get_tasks():
    df = load_tasks()

    status = request.args.get("status")
    search = request.args.get("search")

    if status == "completed":
        df = df[df["completed"] == True]
    elif status == "pending":
        df = df[df["completed"] == False]

    if search:
        search = search.lower()
        title_match = df["title"].fillna("").str.lower().str.contains(search, regex=False)
        description_match = df["description"].fillna("").str.lower().str.contains(search, regex=False)
        df = df[title_match | description_match]

    tasks = [task_to_dict(row) for _, row in df.iterrows()]
    return jsonify(tasks)


@app.post("/api/tasks")
def create_task():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()

    if not title:
        return jsonify({"error": "title is required"}), 400

    df = load_tasks()
    next_id = 1 if df.empty else int(df["id"].max()) + 1
    timestamp = now_iso()

    new_task = {
        "id": next_id,
        "title": title,
        "description": str(payload.get("description", "")).strip(),
        "completed": parse_bool(payload.get("completed", False)),
        "priority": str(payload.get("priority", "medium")).strip() or "medium",
        "due_date": str(payload.get("due_date", "")).strip(),
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    df = pd.concat([df, pd.DataFrame([new_task])], ignore_index=True)
    save_tasks(df)
    return jsonify(new_task), 201


@app.get("/api/tasks/<int:task_id>")
def get_task(task_id):
    df = load_tasks()
    index = find_task(df, task_id)

    if index is None:
        return jsonify({"error": "task not found"}), 404

    return jsonify(task_to_dict(df.loc[index]))


@app.patch("/api/tasks/<int:task_id>")
def update_task(task_id):
    payload = request.get_json(silent=True) or {}
    allowed_fields = ["title", "description", "completed", "priority", "due_date"]
    df = load_tasks()
    index = find_task(df, task_id)

    if index is None:
        return jsonify({"error": "task not found"}), 404

    if "title" in payload and not str(payload["title"]).strip():
        return jsonify({"error": "title cannot be empty"}), 400

    for field in allowed_fields:
        if field in payload:
            if field == "completed":
                df.at[index, field] = parse_bool(payload[field])
            else:
                df.at[index, field] = str(payload[field]).strip()

    df.at[index, "updated_at"] = now_iso()
    save_tasks(df)
    return jsonify(task_to_dict(df.loc[index]))


@app.patch("/api/tasks/<int:task_id>/complete")
def toggle_complete(task_id):
    payload = request.get_json(silent=True) or {}
    completed = parse_bool(payload.get("completed", True))
    df = load_tasks()
    index = find_task(df, task_id)

    if index is None:
        return jsonify({"error": "task not found"}), 404

    df.at[index, "completed"] = completed
    df.at[index, "updated_at"] = now_iso()
    save_tasks(df)
    return jsonify(task_to_dict(df.loc[index]))


@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    df = load_tasks()
    index = find_task(df, task_id)

    if index is None:
        return jsonify({"error": "task not found"}), 404

    deleted_task = task_to_dict(df.loc[index])
    df = df.drop(index).reset_index(drop=True)
    save_tasks(df)
    return jsonify({"deleted": deleted_task})


if __name__ == "__main__":
    ensure_csv()
    app.run(debug=True)
