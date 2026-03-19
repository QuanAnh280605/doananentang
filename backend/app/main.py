from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.cors_origins_list,
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)
app.include_router(api_router, prefix='/api')


@app.get('/', tags=['root'])
def read_root() -> dict[str, str]:
  return {'message': f'{settings.app_name} is running'}

