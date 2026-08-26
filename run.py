import uvicorn
import sys

if __name__ == "__main__":
    print("Starting HepaticShield FastAPI server...", flush=True)
    print("Dashboard will be available at: http://127.0.0.1:8000", flush=True)
    try:
        uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        sys.exit(1)
