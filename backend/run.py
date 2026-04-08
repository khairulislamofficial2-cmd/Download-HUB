import sys

if sys.platform == "win32":
    import uvicorn.loops.auto
    import uvicorn.loops.asyncio
    def setup_loop(*args, **kwargs):
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    uvicorn.loops.auto.auto_loop_setup = setup_loop
    uvicorn.loops.asyncio.setup_loop = setup_loop

import uvicorn

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, loop="asyncio")
