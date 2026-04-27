from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.comments import router as comments_router
from app.api.health import router as health_router
from app.api.posts import router as posts_router
from app.api.users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, tags=['health'])
api_router.include_router(auth_router, prefix='/auth', tags=['auth'])
api_router.include_router(users_router, prefix='/users', tags=['users'])
api_router.include_router(posts_router, prefix='/posts', tags=['posts'])
api_router.include_router(comments_router, prefix='/comments', tags=['comments'])

