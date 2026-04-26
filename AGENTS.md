# Hướng Dẫn Cho Coding Agent

## Phạm vi repo

- Repo này có 3 ứng dụng: `frontend/`, `frontend-web/` và `backend/`.
- `frontend/` là Expo + React Native + Expo Router + TypeScript.
- `frontend-web/` là Next.js App Router + TypeScript.
- `backend/` là FastAPI + SQLAlchemy + Alembic + PostgreSQL + pytest.
- Không có monorepo task runner ở root.
- Chạy lệnh Node và Expo trong `frontend/`.
- Chạy lệnh Node cho web trong `frontend-web/`.
- Chạy lệnh Python, Alembic, pytest, Docker trong `backend/`.

## File nguồn cần ưu tiên đọc

- Frontend scripts: `frontend/package.json`
- Frontend-web scripts: `frontend-web/package.json`
- Frontend TypeScript: `frontend/tsconfig.json`
- Frontend-web TypeScript: `frontend-web/tsconfig.json`
- Frontend ESLint: `frontend/eslint.config.js`
- Frontend-web ESLint: `frontend-web/.eslintrc.json`
- Frontend Expo config: `frontend/app.json`
- Frontend route: `frontend/app/`
- Frontend-web route: `frontend-web/app/`
- Backend dependency: `backend/requirements.txt`
- Backend app: `backend/app/`
- Backend migration: `backend/alembic/`, `backend/alembic.ini`
- Backend Docker: `backend/docker-compose.yml`, `backend/Dockerfile`

## Rules file trong repo

- Rule cho agent nằm ngay trong file này.
- Không tự suy diễn có rule ẩn khác trong repo.

## Quy tắc bắt buộc cho agent

- Luôn trả lời user bằng tiếng Việt.
- Ưu tiên ngắn gọn, rõ việc, nói đúng những gì đã làm.
- Trước khi sửa code, đọc file lân cận để bám đúng pattern hiện có.
- Không tự ý đổi kiến trúc lớn nếu task không yêu cầu.
- Không tự ý thêm dependency nếu stack hiện có đã giải quyết được bài toán.
- Không tự ý tạo commit nếu user chưa yêu cầu.
- Không xóa hay revert thay đổi không phải do mình tạo ra.
- Khi sửa xong phải chạy kiểm tra phù hợp với phần đã đổi.
- Nếu không chạy được kiểm tra, phải nói rõ lý do cụ thể.

## Thư mục làm việc

- Repo root: `/home/quanna/code/doananentang`
- Frontend root: `/home/quanna/code/doananentang/frontend`
- Backend root: `/home/quanna/code/doananentang/backend`

## Cài đặt

- Frontend dùng npm.
- Cài frontend bằng `npm install` trong `frontend/`.
- Cài frontend-web bằng `npm install` trong `frontend-web/`.
- Backend dùng `requirements.txt`.
- Thiết lập backend khuyến nghị:
- `python3 -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements.txt`
- `cp .env.example .env`

## Lệnh chạy frontend

- Dev server: `npm run start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`
- Reset scaffold: `npm run reset-project`
- Lint: `npm run lint`

## Lệnh chạy frontend-web

- Dev server: `npm run dev`
- Build: `npm run build`
- Start production: `npm run start`
- Lint: `npm run lint`

## Lệnh chạy backend

- Chạy PostgreSQL local: `docker compose up -d db`
- Chạy API local: `uvicorn app.main:app --reload`
- Apply migration: `alembic upgrade head`
- Tạo migration: `alembic revision --autogenerate -m "message"`
- Build image backend: `docker build -t doananentang-backend .`
- Chạy backend bằng Docker: `docker run --env-file .env -p 8000:8000 doananentang-backend`
- Chạy cả API + DB bằng Compose: `docker compose up --build api db`
- Compose đọc biến môi trường từ `backend/.env`.
- `DATABASE_URL` dùng cho local run từ host; `DATABASE_URL` dùng cho service `api` trong Compose.
- Compose expose API backend ở cổng `8001` để tránh xung đột cổng `8000` trên máy host.

## Build

- Frontend hiện không có script build chuẩn hóa trong `frontend/package.json`.
- Frontend cũng chưa có `export`, `prebuild`, `eas build`, hay CI build script.
- `frontend/app.json` có `expo.web.output = static` nhưng chưa có script export production.
- Frontend-web có build chuẩn bằng Next.js: `npm run build` trong `frontend-web/`.
- Backend không có bước build riêng ngoài việc build Docker image.
- Nếu thêm build/release flow mới, cập nhật file này trong cùng thay đổi.

## Test

- Frontend hiện chưa có test framework.
- Không được bịa lệnh test cho frontend.
- Backend dùng `pytest` với test trong `backend/app/tests/`.
- Chạy toàn bộ test backend: `pytest`
- Chạy 1 file test backend: `pytest app/tests/test_health.py -q`
- Chạy 1 test case backend: `pytest app/tests/test_users.py::test_create_user -q`

## Single test guidance

- Frontend: chưa hỗ trợ chạy single test.
- Backend: dùng path file hoặc node selector của pytest.
- Nếu sau này thêm test framework cho frontend, phải cập nhật cả lệnh full test và single test.

## Verify bắt buộc trước khi kết thúc

- Nếu sửa frontend, luôn chạy `npm run lint` trong `frontend/`.
- Nếu sửa frontend-web, luôn chạy `npm run lint` và `npm run build` trong `frontend-web/`.
- Nếu sửa backend, luôn chạy `pytest` trong `backend/`.
- Nếu đổi model hoặc migration backend, chạy `alembic upgrade head` hoặc nêu rõ vì sao không chạy được.
- Nếu thêm test framework mới, chạy đúng test của framework đó.
- Nếu thêm typecheck script, phải chạy trước khi kết thúc.

## Tóm tắt stack

- Frontend: Expo SDK 54
- Frontend: React 19
- Frontend: React Native 0.81
- Frontend: Expo Router 6
- Frontend: TypeScript strict
- Frontend: ESLint qua `eslint-config-expo`
- Frontend-web: Next.js 15 + React 19
- Frontend-web: TypeScript strict
- Backend: FastAPI
- Backend: SQLAlchemy 2.x
- Backend: Alembic
- Backend: PostgreSQL
- Backend: pytest

## Kiến trúc hiện tại

- Frontend route nằm trong `frontend/app/`.
- Frontend-web route nằm trong `frontend-web/app/`.
- Frontend layout route dùng `_layout.tsx`.
- Frontend component dùng lại nằm trong `frontend/components/`.
- Frontend hook nằm trong `frontend/hooks/`.
- Frontend theme constant nằm trong `frontend/constants/`.
- Backend route nằm trực tiếp trong `backend/app/api/`.
- Backend config và database nằm trong `backend/app/core/`.
- Backend model nằm trong `backend/app/models/`.
- Backend schema nằm trong `backend/app/schemas/`.
- Backend CRUD/helper DB nằm trong `backend/app/crud/`.
- Backend test nằm trong `backend/app/tests/`.

## Rule kiến trúc backend

- Route backend để trực tiếp dưới `backend/app/api/`, không tự tạo `v1/` nếu chưa có yêu cầu mới.
- Giữ route handler mỏng; logic truy vấn và ghi DB chuyển sang `crud/` khi bắt đầu dài.
- Dùng Pydantic schema cho request và response.
- Dùng SQLAlchemy sync session mặc định, chỉ chuyển async nếu task thực sự cần.
- Giữ cấu hình môi trường trong `backend/app/core/config.py`.
- Dùng Alembic cho thay đổi schema, không viết SQL migration rời rạc nếu không cần.
- Import nội bộ backend bằng absolute import từ `app.`.
- Endpoint lỗi ở backend nên dùng `HTTPException` với message rõ ràng.

## Rule kiến trúc frontend

- Tuân theo Expo Router file-based routing.
- Không đổi tên file đặc biệt như `_layout.tsx`, `modal.tsx` nếu không cần.
- Route component thường là default export.
- Shared component thường ưu tiên named export nếu file xung quanh đang theo pattern đó.
- Giữ tương thích với `typedRoutes` trong `frontend/app.json`.

## TypeScript

- Không hạ `strict: true`.
- Ưu tiên type rõ ràng cho props.
- Dùng `type` cho props và kiểu local, trừ khi `interface` hợp lý hơn.
- Dùng `import type` khi cải thiện độ rõ ràng.
- Tránh `any`; ưu tiên `unknown` rồi narrow.
- Tôn trọng alias `@/*` trong frontend.

## Python

- Dùng typing tường minh như `dict[str, str]`, `list[UserRead]`.
- Giữ module nhỏ, trách nhiệm rõ ràng.
- Không nhét business logic dài trong file route.
- Không hardcode secret hay URL thật vào source commit.

## Imports

- Nhóm import package ngoài trước, import nội bộ sau.
- Giữa 2 nhóm import để 1 dòng trống.
- Xóa import không dùng.
- Frontend ưu tiên alias `@/...` thay vì relative path dài.
- Backend ưu tiên `from app...` thay vì relative import nhiều tầng.

## Naming

- Component React: PascalCase.
- Hook: `useSomething`.
- Class Python: PascalCase.
- Biến và hàm: camelCase ở frontend, snake_case ở backend.
- Hằng số đơn giản: `ALL_CAPS`.
- File backend mới ưu tiên `snake_case`.

## Formatting

- Bám style file lân cận trước khi thêm style mới.
- Frontend hiện dùng 2 spaces, dấu `;`, và thường là single quote.
- Backend trong repo này cũng giữ 2 spaces cho đồng đều.
- JSX dài thì xuống dòng rõ ràng.
- Ưu tiên object/array nhiều dòng nếu giúp dễ đọc.
- Không tự thêm formatter config nếu task không yêu cầu.

## React Native style

- Dùng function component.
- Component nên nhỏ, tập trung, dễ đọc.
- Khi có lặp UI thực sự mới tách shared component.
- Ưu tiên `StyleSheet.create` cho style tái sử dụng.
- Hạn chế inline style, trừ khi giá trị nhỏ và tính toán đơn giản.
- Giữ tương thích với `ThemedText`, `ThemedView`, `useThemeColor`.
- Không làm hỏng dark/light mode đang có.

## State và side effects

- Đặt state gần nơi dùng.
- Không thêm global state library nếu chưa cần.
- Ưu tiên derived state thay vì copy state.
- Không viết effect chỉ để mirror props vào state nếu tránh được.
- Backend phải làm side effect rõ ràng quanh DB, env, file, network.

## Error handling

- Không nuốt lỗi im lặng.
- Frontend dùng `try/catch` khi có async hoặc thao tác dễ lỗi.
- Backend dùng `try/except` hoặc `HTTPException` tùy ngữ cảnh.
- Trong TypeScript, coi lỗi bắt được là `unknown` cho đến khi narrow.
- Trả message lỗi rõ ràng, có thể hành động được.
- Không thêm `alert(...)` mới cho flow thật nếu task không yêu cầu.

## Styling và theme

- Frontend nên tái sử dụng token từ `frontend/constants/theme.ts` khi phù hợp.
- Dùng `useThemeColor` cho màu phụ thuộc light/dark mode.
- Giữ spacing và typography nhất quán với code xung quanh.
- Không hardcode màu lặp đi lặp lại nếu có thể gom token.

## Dependency

- Ưu tiên library đã có sẵn trong repo.
- Không thêm package mới nếu Expo/FastAPI/SQLAlchemy hiện có đã đủ.
- Nếu buộc phải thêm dependency, phải cập nhật docs liên quan.

## Docker rule cho backend

- Dockerfile backend nằm ở `backend/Dockerfile`.
- Docker image backend phải chạy được bằng `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Không ép agent phải chạy backend qua Docker nếu local Python workflow đã đủ.
- `backend/docker-compose.yml` hiện có cả service `db` và `api`.
- Compose backend phải ưu tiên đọc cấu hình từ file `.env`, tránh hardcode biến môi trường ngay trong YAML khi không cần.
- Service `api` trong compose tự chạy `alembic upgrade head` trước khi start Uvicorn.
- Khi đổi cách chạy container, phải cập nhật cả `backend/docker-compose.yml`, `backend/Dockerfile`, `backend/README.md`, `.env.example`, và file này.

## Lint và test expectation

- Frontend chỉ có lint, chưa có test.
- Backend hiện có pytest và phải giữ test pass.
- Nếu thêm tính năng backend mới, nên thêm hoặc cập nhật test tương ứng.
- Nếu không thêm test vì thiếu hạ tầng, phải nói rõ trong final message.

## Safe editing

- Không commit `.env`, `.venv`, `__pycache__`, `.pytest_cache`, file DB local, hay artifact local khác.
- Không xóa file scaffold nếu task không yêu cầu.
- Cẩn thận với file generated của Expo.
- Khi cập nhật command hay convention, cập nhật luôn `AGENTS.md`.

## Kỳ vọng cho final message

- Viết tiếng Việt.
- Nói ngắn gọn đã đổi gì và đổi ở đâu.
- Nêu rõ đã chạy lệnh kiểm tra nào.
- Nếu có hạn chế chưa xử lý được, nói thẳng lý do.
- Chỉ đề xuất bước tiếp theo khi thực sự hợp lý.
