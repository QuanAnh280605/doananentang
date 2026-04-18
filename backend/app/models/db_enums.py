from enum import Enum

from sqlalchemy import Enum as SqlEnum


def _enum_values(enum_cls: type[Enum]) -> list[str]:
  return [member.value for member in enum_cls]


class UserRole(str, Enum):
  USER = 'user'
  ADMIN = 'admin'


class VisibilityLevel(str, Enum):
  PUBLIC = 'public'
  FOLLOWERS_ONLY = 'followersonly'
  CUSTOM = 'custom'
  ONLY_ME = 'onlyme'


class MediaType(str, Enum):
  IMAGE = 'image'
  VIDEO = 'video'
  AUDIO = 'audio'


class NotificationType(str, Enum):
  LIKE = 'like'
  COMMENT = 'comment'
  FOLLOW = 'follow'
  MESSAGE = 'message'
  TAG = 'tag'


class MessageStatusType(str, Enum):
  SENT = 'sent'
  DELIVERED = 'delivered'
  READ = 'read'


user_role_enum = SqlEnum(UserRole, name='user_role', native_enum=False, values_callable=_enum_values)
visibility_level_enum = SqlEnum(VisibilityLevel, name='visibility_level', native_enum=False, values_callable=_enum_values)
media_type_enum = SqlEnum(MediaType, name='media_type', native_enum=False, values_callable=_enum_values)
notification_type_enum = SqlEnum(NotificationType, name='notification_type', native_enum=False, values_callable=_enum_values)
message_status_type_enum = SqlEnum(
  MessageStatusType,
  name='message_status_type',
  native_enum=False,
  values_callable=_enum_values,
)
