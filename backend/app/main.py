from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.state import limiter
from app.routers import expenses, categories, auth, subscriptions, budget
app = FastAPI(title="Finance App API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.include_router(expenses.router)
app.include_router(categories.router)
app.include_router(auth.router)
app.include_router(subscriptions.router)
app.include_router(budget.router)
@app.get("/")
def read_root():
    return {"message": "Finance App API is running"}

