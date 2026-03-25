# 🚀 DoAnAnEnTang — Backend API

REST API xây dựng bằng **FastAPI**, sử dụng **PostgreSQL**, **SQLAlchemy**, **Alembic**, và **pytest**.

---

## 📋 Mục lục

- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [API Endpoints](#-api-endpoints)
- [Database & Migration](#-database--migration)
- [Testing](#-testing)
- [Lệnh tham khảo nhanh](#-lệnh-tham-khảo-nhanh)

---

## 💻 Yêu cầu hệ thống

- **Python** 3.10+
- **Docker** & **Docker Compose** (khuyến khích)
- **PostgreSQL** 16 (nếu chạy không dùng Docker)

---

## 📁 Cấu trúc dự án

```
backend/
├── alembic/                # Database migration (Alembic)
│   ├── versions/           # Các file migration
│   ├── env.py              # Cấu hình môi trường Alembic
│   └── script.py.mako      # Template sinh migration
├── app/                    # Source code chính
│   ├── api/                # Định nghĩa API routes
│   ├── core/               # Cấu hình & hạ tầng
│   │   ├── config.py       # Biến môi trường (Settings)
│   │   └── database.py     # Kết nối database (Engine, Session)
│   ├── crud/               # Thao tác database
│   ├── models/             # ORM Models (SQLAlchemy)
│   │   ├── base.py         # Base class cho các model
│   ├── schemas/            # Request/Response schemas (Pydantic)
│   ├── tests/              # Unit tests
│   └── main.py             # Entry point — khởi tạo FastAPI app
├── .env.example            # Mẫu biến môi trường
├── alembic.ini             # Cấu hình Alembic
├── docker-compose.yml      # Docker Compose (API + PostgreSQL)
├── Dockerfile              # Build Docker image
└── requirements.txt        # Thư viện Python
```

---

## 🛠️ Cài đặt & Chạy

Chạy cả API + PostgreSQL:

```bash
cp .env.example .env
```

```bash
docker compose up --build
```

- **API** chạy tại: `http://localhost:8000`
- **PostgreSQL** chạy tại: `localhost:5433`
- Migration tự động chạy khi container khởi động

---

### 📖 Swagger UI

Truy cập tài liệu API tự động tại: `http://localhost:8000/docs`

---

## 🔐 Authentication

Backend hiện hỗ trợ auth cơ bản với JWT access token:

- `POST /api/auth/register` — tạo tài khoản bằng `contact` (email hoặc phone), `password`, `first_name`, `last_name`, `birth_date`, `gender`
- `POST /api/auth/login` — đăng nhập bằng `identifier` (email hoặc phone) + `password`
- `GET /api/auth/me` — lấy thông tin user hiện tại qua Bearer token

Ví dụ payload đăng ký:

```json
{
  "contact": "alice@example.com",
  "password": "secret123",
  "first_name": "Alice",
  "last_name": "Example",
  "birth_date": "2000-01-02",
  "gender": "female"
}
```

---

## 🗄️ Database & Migration

### Tạo migration mới

Sau khi thay đổi model trong `app/models/`, chạy:

```bash
alembic revision --autogenerate -m "mô tả thay đổi"
```

### Áp dụng migration

```bash
alembic upgrade head
```

### Rollback migration

```bash
# Rollback 1 bước
alembic downgrade -1

# Rollback về đầu
alembic downgrade base
```

### Xem migration hiện tại

```bash
alembic current
```

---

## 🧪 Testing

```bash
# Chạy tất cả tests
pytest

# Chạy 1 file test cụ thể
pytest app/tests/test_health.py -q

# Chạy 1 test case cụ thể
pytest app/tests/test_users.py::test_create_user -q

# Chạy tests với output chi tiết
pytest -v
```

---

## ⚡ Lệnh tham khảo nhanh

| Lệnh | Mô tả |
|-------|--------|
| `docker compose up --build` | Chạy toàn bộ (API + DB) |
| `docker compose up -d db` | Chỉ chạy PostgreSQL |
| `docker compose down` | Dừng tất cả container |
| `docker compose logs -f api` | Xem logs của API |
| `uvicorn app.main:app --reload` | Chạy API local (dev mode) |
| `alembic upgrade head` | Áp dụng tất cả migration |
| `alembic revision --autogenerate -m "msg"` | Tạo migration mới |
| `pytest` | Chạy tất cả tests |

---

## ⚙️ Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `APP_NAME` | `doananentang-backend` | Tên ứng dụng |
| `APP_ENV` | `development` | Môi trường (development/production) |
| `APP_HOST` | `0.0.0.0` | Host binding |
| `APP_PORT` | `8000` | Port của server |
| `DATABASE_URL` | `postgresql+psycopg://...` | Connection string đến PostgreSQL |
| `JWT_SECRET_KEY` | `change-me` | Secret key dùng để ký access token |
| `JWT_ALGORITHM` | `HS256` | Thuật toán ký JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Thời gian sống access token |

---

## 📝 Ghi chú

- PostgreSQL được expose ra port **`5433`** (tránh xung đột với Postgres trên máy host).
- Docker Compose expose API ra port **`8001`** (tránh xung đột với port `8000` trên máy host).
- Khi chạy bằng Docker Compose, migration tự động chạy trước khi server khởi động.
