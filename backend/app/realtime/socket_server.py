import logging
from typing import Any

from anyio import from_thread
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
USER_PRESENCE_CHANGED_EVENT = 'user-presence-changed'
ONLINE_USERS_SNAPSHOT_EVENT = 'online-users-snapshot'
POST_METRICS_UPDATED_EVENT = 'post-metrics-updated'


class PresenceRegistry:
  def __init__(self) -> None:
    self._user_ids_by_sid: dict[str, int] = {}
    self._sids_by_user_id: dict[int, set[str]] = {}

  def connect(self, sid: str, user_id: int) -> bool:
    existing_user_id = self._user_ids_by_sid.get(sid)
    if existing_user_id is not None:
      self.disconnect(sid)

    self._user_ids_by_sid[sid] = user_id
    user_sids = self._sids_by_user_id.setdefault(user_id, set())
    was_offline = len(user_sids) == 0
    user_sids.add(sid)
    return was_offline

  def disconnect(self, sid: str) -> tuple[int | None, bool]:
    user_id = self._user_ids_by_sid.pop(sid, None)
    if user_id is None:
      return None, False

    user_sids = self._sids_by_user_id.get(user_id)
    if user_sids is None:
      return user_id, False

    user_sids.discard(sid)
    if user_sids:
      return user_id, False

    self._sids_by_user_id.pop(user_id, None)
    return user_id, True

  def is_online(self, user_id: int) -> bool:
    return bool(self._sids_by_user_id.get(user_id))

  def get_online_user_ids(self) -> list[int]:
    return sorted(self._sids_by_user_id)


presence_registry = PresenceRegistry()


def get_user_room_name(user_id: int) -> str:
  return f'user:{user_id}'


def get_post_room_name(post_id: int) -> str:
  return f'post:{post_id}'


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
  await sio.enter_room(sid, get_user_room_name(user.id))
  became_online = presence_registry.connect(sid, user.id)
  await sio.emit(ONLINE_USERS_SNAPSHOT_EVENT, {'user_ids': presence_registry.get_online_user_ids()}, to=sid)
  if became_online:
    await sio.emit(USER_PRESENCE_CHANGED_EVENT, {'user_id': user.id, 'is_online': True})


@sio.event
async def disconnect(sid: str) -> None:
  user_id, became_offline = presence_registry.disconnect(sid)
  if user_id is not None:
    await sio.leave_room(sid, get_user_room_name(user_id))
  if user_id is not None and became_offline:
    await sio.emit(USER_PRESENCE_CHANGED_EVENT, {'user_id': user_id, 'is_online': False})


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


def _parse_post_id(payload: Any) -> int | None:
  if not isinstance(payload, dict):
    return None

  post_id = payload.get('post_id')
  try:
    return int(post_id)
  except (TypeError, ValueError):
    logger.warning('Invalid post room payload', extra={'post_id': post_id})
    return None


async def emit_post_metrics_updated(post_id: int, payload: dict[str, object]) -> None:
  try:
    await sio.emit(POST_METRICS_UPDATED_EVENT, payload, room=get_post_room_name(post_id))
  except Exception:
    logger.exception('Failed to emit post-metrics-updated event', extra={'post_id': post_id})


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


@sio.on('post:join')
async def join_post_room(sid: str, payload: dict[str, Any] | None) -> dict[str, Any]:
  post_id = _parse_post_id(payload)
  user_id = await _get_socket_user_id(sid)
  if user_id is None or post_id is None:
    return {'ok': False}

  room = get_post_room_name(post_id)
  await sio.enter_room(sid, room)
  return {'ok': True, 'room': room}


@sio.on('post:leave')
async def leave_post_room(sid: str, payload: dict[str, Any] | None) -> dict[str, Any]:
  post_id = _parse_post_id(payload)
  user_id = await _get_socket_user_id(sid)
  if user_id is None or post_id is None:
    return {'ok': False}

  room = get_post_room_name(post_id)
  await sio.leave_room(sid, room)
  return {'ok': True, 'room': room}
