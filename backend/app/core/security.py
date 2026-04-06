import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import get_settings

PASSWORD_HASH_ITERATIONS = 100_000


def hash_password(password: str) -> str:
  salt = os.urandom(16)
  digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PASSWORD_HASH_ITERATIONS)
  encoded_salt = base64.b64encode(salt).decode('utf-8')
  encoded_digest = base64.b64encode(digest).decode('utf-8')
  return f'{PASSWORD_HASH_ITERATIONS}${encoded_salt}${encoded_digest}'


def verify_password(password: str, hashed_password: str) -> bool:
  try:
    iterations_text, encoded_salt, encoded_digest = hashed_password.split('$', maxsplit=2)
    iterations = int(iterations_text)
    salt = base64.b64decode(encoded_salt.encode('utf-8'))
    expected_digest = base64.b64decode(encoded_digest.encode('utf-8'))
  except (TypeError, ValueError):
    return False

  candidate_digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
  return hmac.compare_digest(candidate_digest, expected_digest)


def create_access_token(subject: str) -> str:
  settings = get_settings()
  expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
  payload: dict[str, Any] = {
    'sub': subject,
    'exp': expires_at,
    'type': 'access_token'
  }
  return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
  settings = get_settings()
  payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
  if payload['type'] != 'access_token':
    raise ValueError('Invalid token type')
  return payload


def create_reset_token(email: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    payload = {
        "sub": email,
        "exp": expires_at,
        "type": "reset_password"
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_reset_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    if payload['type'] != 'reset_password':
        raise ValueError('Invalid token type')
    return payload
