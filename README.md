# Flask CSV To-Do API

A small full-stack-ready to-do API built with Flask and pandas. Tasks are stored in `data/tasks.csv`, so you can inspect the data easily while learning.

## Setup

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the server:

```bash
python app.py
```

The API runs at:

```text
http://127.0.0.1:5000
```

## Frontend

Open the app in your browser:

```text
http://127.0.0.1:5000/
```

The UI lets you create, search, filter, complete, and delete tasks. It uses the same API routes shown below, and the data still saves to `data/tasks.csv`.

## Task Shape

```json
{
  "id": 1,
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed": false,
  "priority": "medium",
  "due_date": "2026-06-30",
  "created_at": "2026-06-28T14:00:00+00:00",
  "updated_at": "2026-06-28T14:00:00+00:00"
}
```

## Curl Test Commands

### Health Check

```bash
curl.exe http://127.0.0.1:5000/api/health
```

### Create A Task

```bash
curl.exe -X POST http://127.0.0.1:5000/api/tasks -H "Content-Type: application/json" -d "{\"title\":\"Buy groceries\",\"description\":\"Milk, eggs, bread\",\"priority\":\"medium\",\"due_date\":\"2026-06-30\"}"
```

### Create Another Task

```bash
curl.exe -X POST http://127.0.0.1:5000/api/tasks -H "Content-Type: application/json" -d "{\"title\":\"Finish Flask project\",\"description\":\"Build and test the CSV-backed API\",\"priority\":\"high\",\"due_date\":\"2026-07-01\"}"
```

### Get All Tasks

```bash
curl.exe http://127.0.0.1:5000/api/tasks
```

### Get One Task

```bash
curl.exe http://127.0.0.1:5000/api/tasks/1
```

### Update A Task

```bash
curl.exe -X PATCH http://127.0.0.1:5000/api/tasks/1 -H "Content-Type: application/json" -d "{\"title\":\"Buy groceries and snacks\",\"priority\":\"low\"}"
```

### Mark A Task Complete

```bash
curl.exe -X PATCH http://127.0.0.1:5000/api/tasks/1/complete -H "Content-Type: application/json" -d "{\"completed\":true}"
```

### Mark A Task Pending Again

```bash
curl.exe -X PATCH http://127.0.0.1:5000/api/tasks/1/complete -H "Content-Type: application/json" -d "{\"completed\":false}"
```

### Filter Completed Tasks

```bash
curl.exe "http://127.0.0.1:5000/api/tasks?status=completed"
```

### Filter Pending Tasks

```bash
curl.exe "http://127.0.0.1:5000/api/tasks?status=pending"
```

### Search Tasks

```bash
curl.exe "http://127.0.0.1:5000/api/tasks?search=flask"
```

### Delete A Task

```bash
curl.exe -X DELETE http://127.0.0.1:5000/api/tasks/1
```

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the API is running |
| `GET` | `/api/tasks` | Get all tasks |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/<id>` | Get one task |
| `PATCH` | `/api/tasks/<id>` | Update a task |
| `PATCH` | `/api/tasks/<id>/complete` | Mark a task complete or pending |
| `DELETE` | `/api/tasks/<id>` | Delete a task |

## Notes

- `title` is required when creating a task.
- The CSV file is created automatically at `data/tasks.csv`.
- This is good for learning and small demos. For a real production app, switch from CSV to a database like SQLite or PostgreSQL.
