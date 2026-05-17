import logging
from typing import Any

from jwt import InvalidTokenError
import socketio
from socketio.exceptions import ConnectionRefusedError

from app.api.deps import get_user_from_access_token
from app.crud.chat import get_chat_room_name, is_chat_member
from app.core import database
from app.core.config import get_settings

settings = get_settings()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=settings.cors_origins_list)
logger = logging.getLogger(__name__)


def create_socket_app(other_asgi_app: Any = None) -> socketio.ASGIApp:
  return socketio.ASGIApp(sio, other_asgi_app=other_asgi_app, socketio_path=settings.socketio_path)


socket_app = create_socket_app()


@sio.event
async def connect(sid: str, environ: dict[str, Any], auth: dict[str, Any] | None) -> None:
  del environ

  token = auth.get('token') if isinstance(auth, dict) else None
  if not token:
    raise ConnectionRefusedError('Invalid credentials')

  db = database.SessionLocal()
  try:
    user = get_user_from_access_token(db, token)
  except (InvalidTokenError, ValueError) as error:
    raise ConnectionRefusedError('Invalid credentials') from error
  finally:
    db.close()

  if user is None:
    raise ConnectionRefusedError('Invalid credentials')

  await sio.save_session(sid, {'user_id': user.id})


async def _get_socket_user_id(sid: str) -> int | None:
  session = await sio.get_session(sid)
  user_id = session.get('user_id')
  return int(user_id) if user_id is not None else None


def _parse_chat_id(payload: Any) -> int | None:
  if not isinstance(payload, dict):
    return None

  chat_id = payload.get('chat_id')
  try:
    return int(chat_id)
  except (TypeError, ValueError):
    logger.warning('Invalid chat room payload', extra={'chat_id': chat_id})
    return None


@sio.on('chat:join')
async def join_chat_room(sid: str, payload: dict[str, Any] | None) -> dict[str, Any]:
  chat_id = _parse_chat_id(payload)
  user_id = await _get_socket_user_id(sid)
  if user_id is None or chat_id is None:
    return {'ok': False}

  db = database.SessionLocal()
  try:
    if not is_chat_member(db, chat_id, user_id):
      return {'ok': False}
  finally:
    db.close()

  room = get_chat_room_name(chat_id)
  await sio.enter_room(sid, room)
  return {'ok': True, 'room': room}


@sio.on('chat:leave')
async def leave_chat_room(sid: str, payload: dict[str, Any] | None) -> dict[str, Any]:
  chat_id = _parse_chat_id(payload)
  user_id = await _get_socket_user_id(sid)
  if user_id is None or chat_id is None:
    return {'ok': False}

  db = database.SessionLocal()
  try:
    if not is_chat_member(db, chat_id, user_id):
      return {'ok': False}
  finally:
    db.close()

  room = get_chat_room_name(chat_id)
  await sio.leave_room(sid, room)
  return {'ok': True, 'room': room}
