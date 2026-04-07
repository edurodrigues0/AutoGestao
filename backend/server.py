"""Compat entrypoint: use `uvicorn app.main:app` from the backend directory."""

import os

if __name__ == "__main__":
    import uvicorn

    _debug = os.environ.get("DEBUG", "true").lower() in ("1", "true", "yes")
    log_level = "debug" if _debug else "info"
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, log_level=log_level, reload=True)
