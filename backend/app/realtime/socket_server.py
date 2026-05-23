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
  """Registry to manage and track active online user sessions (Presence).
  
  Supports multi-device login where a single user can have multiple active socket connections (sids).
  """
  def __init__(self) -> None:
    # Maps socket session ID (sid) to user_id for fast reverse lookup
    self._user_ids_by_sid: dict[str, int] = {}
    # Maps user_id to a set of active socket session IDs (sids)
    self._sids_by_user_id: dict[int, set[str]] = {}

  def connect(self, sid: str, user_id: int) -> bool:
    """Registers a new active socket session for a user.
    
    Returns:
      bool: True if the user was offline before this connection (went online), False otherwise.
    """
    # Clean up any existing stale session for this sid if present
    existing_user_id = self._user_ids_by_sid.get(sid)
    if existing_user_id is not None:
      self.disconnect(sid)

    # Register the session ID associated with the user
    self._user_ids_by_sid[sid] = user_id
    
    # Get or initialize the active sessions set for this user
    user_sids = self._sids_by_user_id.setdefault(user_id, set())
    # User is considered was_offline if they had 0 active sessions before this one
    was_offline = len(user_sids) == 0
    # Add the current session ID to user's active connections list
    user_sids.add(sid)
    return was_offline

  def disconnect(self, sid: str) -> tuple[int | None, bool]:
    """Unregisters a disconnected socket session.
    
    Returns:
      tuple[int | None, bool]: A tuple containing:
        - user_id (int | None): The ID of the disconnected user, or None if not registered.
        - became_offline (bool): True if the user has no remaining active sessions (went offline), False otherwise.
    """
    # Remove the session ID registration
    user_id = self._user_ids_by_sid.pop(sid, None)
    if user_id is None:
      return None, False

    # Get the active sessions set for this user
    user_sids = self._sids_by_user_id.get(user_id)
    if user_sids is None:
      return user_id, False

    # Remove the disconnected session ID from the user's active set
    user_sids.discard(sid)
    
    # If the user still has other active sessions (e.g. online on other devices), they are still online
    if user_sids:
      return user_id, False

    # If no active sessions are left, completely remove the user from the registry (went offline)
    self._sids_by_user_id.pop(user_id, None)
    return user_id, True

  def is_online(self, user_id: int) -> bool:
    """Checks if a user is currently online on any device."""
    return bool(self._sids_by_user_id.get(user_id))

  def get_online_user_ids(self) -> list[int]:
    """Returns a sorted list of all currently online user IDs."""
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
