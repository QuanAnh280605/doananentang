# Đồ Án Đa Nền Tảng (Cross-Platform Social Network)

Dự án này là một ứng dụng mạng xã hội đa nền tảng (hỗ trợ Mobile và Web) được phát triển dưới dạng đồ án môn học. Ứng dụng cung cấp các tính năng cốt lõi của một mạng xã hội như quản lý người dùng, bài đăng, bình luận, nhắn tin, quản lý nhóm và thông báo.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Frontend](https://img.shields.io/badge/frontend-React_Native_%7C_Expo-blue.svg)
![Backend](https://img.shields.io/badge/backend-FastAPI_%7C_Python-green.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL-blue.svg)

## 📌 Tính năng chính (Features)

Dựa trên cấu trúc cơ sở dữ liệu hiện tại, hệ thống hỗ trợ các tính năng:
- **Người dùng (Users)**: Xác thực, quản lý hồ sơ (Profile), cập nhật ảnh đại diện (avatar).
- **Mạng lưới xã hội (Social Graph)**: Tính năng theo dõi (Follow/Unfollow).
- **Tương tác nội dung (Engagement)**: Bài đăng (Posts), đa phương tiện (Post Media), Bình luận (Comments), Lượt thích (Likes).
- **Tin nhắn & Nhóm (Messaging & Groups)**: Nhắn tin riêng (Messages), theo dõi trạng thái đã đọc, tạo và quản lý Nhóm (Groups, Group Members).
- **Tin ngắn thảo luận (Stories)**: Chia sẻ story tạm thời.
- **Thông báo (Notifications)**: Đẩy thông báo các hoạt động tương tác.

## 🛠️ Công nghệ sử dụng (Tech Stack)

### Frontend (Ứng dụng Mobile & Web)
- **Framework**: React Native 0.81, React 19
- **Platform**: Expo SDK 54, Expo Router v6 (File-based routing)
- **Language**: TypeScript (Strict mode)
- **Styling**: NativeWind (Tailwind CSS cho React Native)
- **Navigation**: React Navigation liên hợp Expo Router
- **Lints**: ESLint (eslint-config-expo)

### Backend (REST API)
- **Framework**: FastAPI (Python)
- **Database ORM**: SQLAlchemy 2.x
- **Database Migration**: Alembic
- **Database Engine**: PostgreSQL
- **Data Validation**: Pydantic schemas
- **Testing**: `pytest`
- **Deployment & Containerization**: Docker, Docker Compose

## 🚀 Hướng dấn cài đặt và Chạy ứng dụng (Getting Started)

Dự án được chia thành 2 module độc lập: `frontend` và `backend`.

### 1. Cài đặt Backend

Khuyến nghị sử dụng Docker để chạy Database và API dễ dàng nhất.

**Cách 1: Sử dụng Docker Compose (Đề xuất)**
```bash
cd backend
# Cấu hình biến môi trường
cp .env.example .env
# Khởi chạy toàn bộ dịch vụ (API + PostgreSQL DB)
docker compose up --build api db
```
API sẽ chạy trên `http://localhost:8001` (hoặc cổng được cấu hình trên host). Alembic migrations sẽ tự động chạy khi khởi động bằng docker compose.

**Cách 2: Chạy Local (Môi trường ảo)**
Cần có một database PostgreSQL đã chạy ở background.
```bash
cd backend
# Tạo và kích hoạt môi trường ảo
python3 -m venv .venv
source .venv/bin/activate  # Trên Windows dùng: .venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt

# Cấu hình file .env
cp .env.example .env
# (Sửa biến DATABASE_URL trong .env trỏ tới DB PostgreSQL của bạn)

# Chạy Database Migrations
alembic upgrade head

# Khởi chạy server
uvicorn app.main:app --reload
```
API sẽ chạy tại `http://localhost:8000`. Bạn có thể truy cập `/docs` để xem tài liệu Swagger UI.

### 2. Cài đặt Frontend

Yêu cầu: Node.js (khuyến nghị phiển bản LTS từ v18 trở lên).

```bash
cd frontend

# Cài đặt dependencies
npm install

# Khởi chạy dự án với Expo
npm run start
```

Từ Expo CLI terminal, bạn có thể:
- Bấm `a` để chạy trên Android Emulator.
- Bấm `i` để chạy trên iOS Simulator.
- Bấm `w` để chạy trên trình duyệt Web.

## 📂 Kiến trúc Thư mục

```text
doananentang/
├── frontend/                 # Mã nguồn UI ứng dụng (React Native)
│   ├── app/                  # File-based routing của Expo Router
│   ├── components/           # Các component dùng chung (Shared Components)
│   ├── constants/            # Định nghĩa biến môi trường, màu sắc, theme
│   ├── hooks/                # Custom React Hooks
│   ├── package.json          # Quản lý script và thư viện npm
│   └── tsconfig.json         # Cấu hình TypeScript
│
└── backend/                  # Mã nguồn API (FastAPI)
    ├── alembic/              # Thư mục lưu lịch sử migration (cấu trúc DB)
    ├── app/
    │   ├── api/              # Định nghĩa các Endpoints (Routes)
    │   ├── core/             # Cấu hình chung, security, db connection
    │   ├── models/           # Định nghĩa cấu trúc bảng (SQLAlchemy)
    │   ├── schemas/          # Data validation schema (Pydantic)
    │   ├── crud/             # Các lớp thao tác dữ liệu DB (Create, Read, Update, Delete)
    │   └── tests/            # Thư mục chứa Unit test dùng pytest
    ├── docker-compose.yml    # Cấu trúc container (DB, API)
    ├── Dockerfile            # Cấu hình để build backend image
    ├── alembic.ini           # Cấu hình của trình quản lý DB Migration
    └── requirements.txt      # Chứa các gói thư viện Python
```

## 📋 Convention & Quy định đóng góp (Contribution Guidelines)

**Frontend:**
- Hỗ trợ TypeScript Strict, cấm để kiểu `any` mà không có lý do thiết yếu.
- Route tuân thủ theo rule của `expo-router`.
- Định dạng code đồng nhất, sử dụng `npm run lint` để kiểm tra chất lượng code.
- Hạn chế inline style, ưu tiên sử dụng `NativeWind` hoặc các style object tập trung trong file.

**Backend:**
- Cấu trúc thư mục chia tách: Routes(`api`) mong mỏng, logic thao tác DB nằm ở (`crud`). 
- Xử lý các request ngoại lệ phải trả về `HTTPException` với thông báo tương ứng.
- Tuyệt đối không hardcode URLs, secrets trực tiếp trên file, sử dụng Environment Variables từ `app.core.config`.
- Mọi cập nhật liên quan tới model (như tính năng profile, chat) đều phải sinh bản migration mới (`alembic revision --autogenerate`) và được kiểm tra kĩ trước khi đẩy lên.

---
*Thuộc khuôn khổ Đồ Án Phát Triển Ứng Dụng Đa Nền Tảng*
