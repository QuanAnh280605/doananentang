import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.realtime.socket_server import create_socket_app

settings = get_settings()

os.makedirs('uploads/avatars', exist_ok=True)

rest_app = FastAPI(title=settings.app_name)
rest_app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.cors_origins_list,
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)
rest_app.include_router(api_router, prefix='/api')
rest_app.mount('/static', StaticFiles(directory='uploads'), name='static')
app = create_socket_app(rest_app)


@rest_app.get('/', tags=['root'])
def read_root() -> dict[str, str]:
  return {'message': f'{settings.app_name} is running'}

