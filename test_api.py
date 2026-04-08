import requests
try:
    res = requests.post("http://127.0.0.1:8000/api/v1/info", json={"url": "https://youtu.be/dQw4w9WgXcQ"})
    print("STATUS:", res.status_code)
    try:
        data = res.json()
        print("JSON length:", len(str(data)))
        print("Title:", data.get("title", ""))
        print("Formats length:", len(data.get("formats", [])))
        if res.status_code != 200:
            print("ERROR DETAILS:", data)
    except Exception as e:
        print("Not json:", res.text)
except Exception as e:
    print("Exception:", e)
