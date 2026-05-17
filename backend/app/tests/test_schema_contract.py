from pathlib import Path

from app.models.base import Base
from app.models import *  # noqa: F403


EXPECTED_NEW_TABLES = {
  'stories',
  'posts',
  'post_media',
  'comments',
  'likes',
  'follows',
  'chats',
  'chat_members',
  'messages',
  'message_status',
  'notifications',
}

EXPECTED_INDEXES = {
  'stories': {'idx_stories_user_id'},
  'posts': {'idx_posts_author_created_at'},
  'post_media': {'idx_post_media_post_id'},
  'comments': {'idx_comments_post_id'},
  'follows': {'idx_follows_following_id'},
  'messages': {'idx_messages_chat_created_at'},
  'notifications': {'idx_notifications_actor_id', 'idx_notifications_receiver_created_at'},
}


def test_metadata_contains_all_new_social_tables() -> None:
  metadata_tables = set(Base.metadata.tables)

  assert 'users' in metadata_tables
  assert 'login_sessions' in metadata_tables
  assert EXPECTED_NEW_TABLES.issubset(metadata_tables)


def test_join_tables_use_composite_primary_keys() -> None:
  expected_primary_keys = {
    'likes': {'user_id', 'post_id'},
    'follows': {'follower_id', 'following_id'},
    'chat_members': {'chat_id', 'user_id'},
    'message_status': {'message_id', 'user_id'},
  }

  for table_name, expected_columns in expected_primary_keys.items():
    table = Base.metadata.tables[table_name]
    assert {column.name for column in table.primary_key.columns} == expected_columns


def test_social_tables_have_required_foreign_keys() -> None:
  expected_foreign_keys = {
    'stories': {('user_id', 'users.id')},
    'posts': {('author_id', 'users.id')},
    'post_media': {('post_id', 'posts.id')},
    'comments': {('post_id', 'posts.id'), ('author_id', 'users.id')},
    'likes': {('user_id', 'users.id'), ('post_id', 'posts.id')},
    'follows': {('follower_id', 'users.id'), ('following_id', 'users.id')},
    'chat_members': {('chat_id', 'chats.id'), ('user_id', 'users.id')},
    'messages': {('chat_id', 'chats.id'), ('sender_id', 'users.id')},
    'message_status': {('message_id', 'messages.id'), ('user_id', 'users.id')},
    'notifications': {
      ('receiver_id', 'users.id'),
      ('actor_id', 'users.id'),
      ('post_id', 'posts.id'),
      ('comment_id', 'comments.id'),
      ('message_id', 'messages.id'),
      ('related_user_id', 'users.id'),
    },
  }

  for table_name, expected_pairs in expected_foreign_keys.items():
    table = Base.metadata.tables[table_name]
    actual_pairs = {
      (fk.parent.name, f'{fk.column.table.name}.{fk.column.name}')
      for fk in table.foreign_keys
    }
    assert expected_pairs.issubset(actual_pairs)


def test_follows_table_has_self_follow_guard() -> None:
  follows_table = Base.metadata.tables['follows']
  constraints = {
    str(sqltext)
    for constraint in follows_table.constraints
    for sqltext in [getattr(constraint, 'sqltext', None)]
    if sqltext is not None
  }

  assert 'follower_id != following_id' in constraints


def test_social_tables_have_required_indexes() -> None:
  for table_name, expected_indexes in EXPECTED_INDEXES.items():
    table = Base.metadata.tables[table_name]
    actual_indexes = {index.name for index in table.indexes}

    assert expected_indexes.issubset(actual_indexes)


def test_posts_table_has_reported_count_column() -> None:
  posts_table = Base.metadata.tables['posts']

  assert 'reported_count' in posts_table.c
  assert posts_table.c['reported_count'].nullable is False



