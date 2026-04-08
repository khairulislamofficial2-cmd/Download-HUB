import anyio
import asyncio
import sys

async def test_anyio():
    async with await anyio.open_process(["yt-dlp", "--version"]) as process:
        async for text in process.stdout:
            print(text.decode())

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

asyncio.run(test_anyio())
