"""Compat entrypoint: use `uvicorn app.main:app` from the backend directory."""

from app.main import app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", reload=True)
