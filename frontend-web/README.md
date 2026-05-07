# DoAnAnEnTang — Frontend Web

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Verify

```bash
npm run lint
npm run build
```

## Inbox realtime (local dev)

- Socket.IO server mặc định đi qua backend origin với path `/socket.io`
- Socket handshake dùng JWT access token: `socket.auth = { token: '<access-token>' }`
- Khi mở hội thoại, client join room `chat:{chat_id}`; khi đổi hội thoại thì leave room cũ
- Client lắng nghe event `message-created` để nhận tin nhắn mới theo room
- Luồng gửi vẫn giữ REST `POST /api/chats/{chat_id}/messages`; UI dedup message theo `message.id` để không nhân đôi giữa optimistic state và event realtime
