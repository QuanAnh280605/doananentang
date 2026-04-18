from sqlalchemy import Integer
from sqlalchemy.orm import mapped_column

ID_TYPE = Integer()
UUID_TYPE = ID_TYPE


def uuid_pk(column_name: str):
  return mapped_column(
    column_name,
    ID_TYPE,
    primary_key=True,
    nullable=False,
    autoincrement=True,
  )


def uuid_column(column_name: str, *, nullable: bool = False):
  return mapped_column(column_name, ID_TYPE, nullable=nullable)
