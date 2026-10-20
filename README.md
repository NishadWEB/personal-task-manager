# 🚀 Personal Task Manager

A simple task management web application built with **Django REST Framework**, **PostgreSQL**, and **JavaScript**.

## ✨ Features

- 🔐 User registration and JWT authentication
- ✅ Create, view, update, and delete tasks
- 🎯 Manage task status, priority, and due dates
- 🔍 Search, filtering, and pagination
- 📊 Dashboard statistics
- 🛡️ User-specific task access
- 📖 Interactive API documentation with Swagger

## 🛠️ Tech Stack

- **Backend:** Django, Django REST Framework
- **Database:** PostgreSQL
- **Frontend:** HTML, CSS, JavaScript (Fetch API)

## ⚙️ Installation

**1. Clone the repository**
```bash
git clone https://github.com/NishadWEB/personal-task-manager.git
cd personal-task-manager
```

**2. Install dependencies**
```bash
pip install django djangorestframework djangorestframework-simplejwt psycopg django-filter drf-spectacular python-dotenv
```

**3. Configure your `.env` file** with your database credentials and Django settings.

**4. Run migrations and start the server**
```bash
python manage.py migrate
python manage.py runserver
```

## 📚 API Documentation

Open **`/api/docs/`** while the development server is running.

## 🧪 Run Tests

```bash
python manage.py test
```
