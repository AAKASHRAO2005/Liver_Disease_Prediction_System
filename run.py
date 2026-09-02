import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting HepaticShield FastAPI server on {host}:{port}...", flush=True)
    try:
        uvicorn.run("app:app", host=host, port=port, reload=False)
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        sys.exit(1)

