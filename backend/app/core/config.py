from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  app_name: str = 'doananentang-backend'
  app_env: str = 'development'
  app_host: str = '0.0.0.0'
  app_port: int = 8000
  database_url: str = 'postgresql+psycopg://postgres:postgres@localhost:5433/doananentang'
  cors_origins: str = 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006'

  model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

  @property
  def cors_origins_list(self) -> list[str]:
    return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]


@lru_cache
def get_settings() -> Settings:
  return Settings()
