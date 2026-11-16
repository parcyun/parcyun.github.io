"""Read-only, bounded Standard Korean Dictionary proxy. No browser credentials."""
import json
import os
import re
import threading
import time
import xml.etree.ElementTree as ET
from collections import OrderedDict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen

ORIGIN = "https://parcyun.github.io"


def many(value):
    return value if isinstance(value, list) else [value] if value else []


def xml_value(element):
    if not list(element):
        return (element.text or "").strip()
    result = {}
    for child in element:
        value = xml_value(child)
        if child.tag in result:
            result[child.tag] = many(result[child.tag]) + [value]
        else:
            result[child.tag] = value
    return result


def normalize_search(data):
    channel = data.get("channel", {})
    return {"total": int(channel.get("total") or 0), "items": [
        {"word": item["word"], "number": item.get("sup_no", "0"),
         "code": str(item["target_code"]), "pos": item.get("pos", ""),
         "definition": item.get("sense", {}).get("definition", "")}
        for item in many(channel.get("item"))]}


def normalize_detail(data):
    item = many(data.get("channel", {}).get("item"))
    word = item[0].get("word_info", {}) if item else {}
    groups = []
    for pos in many(word.get("pos_info")):
        senses = []
        for pattern in many(pos.get("comm_pattern_info")):
            for sense in many(pattern.get("sense_info")):
                senses.append({"definition": sense.get("definition", ""), "examples": [
                    example["example"] for example in many(sense.get("example_info"))
                    if example.get("example") and not example.get("source")]})
        groups.append({"pos": pos.get("pos", ""), "senses": senses})
    return {"word": word.get("word", ""), "groups": groups,
            "origin": ", ".join(x["original_language"] for x in many(word.get("original_language_info")) if x.get("original_language")),
            "pronunciation": [p for x in many(word.get("pronunciation_info")) for p in many(x.get("pronunciation"))]}


def query_provider(kind, value):
    key = os.environ.get("STDICT_API_KEY", "").strip()
    if not re.fullmatch(r"[a-fA-F0-9]{32}", key):
        raise ValueError("Dictionary authorization unavailable")
    detail = kind == "detail"
    params = {"key": key, "q": value, "req_type": "xml" if detail else "json",
              "method": "target_code" if detail else "exact"}
    if not detail:
        params.update(advanced="y", num=100, start=1)
    request = Request("https://stdict.korean.go.kr/api/" + ("view.do" if detail else "search.do") + "?" + urlencode(params),
                      headers={"User-Agent": "parcyun-satury-dictionary/1.0", "Referer": ORIGIN + "/"})
    with urlopen(request, timeout=20) as response:
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError("Dictionary response too large")
    text = raw.decode("utf-8-sig")
    if detail:
        root = ET.fromstring(text.strip())
        data = {root.tag: xml_value(root)}
    else:
        data = json.loads(text)
    # The provider returns {} (not a channel with total=0) for absent headwords.
    if not detail and data == {}:
        return {"total": 0, "items": []}
    if "error" in data or "channel" not in data:
        raise ValueError("Dictionary provider unavailable")
    return normalize_detail(data) if detail else normalize_search(data)


class Dictionary:
    def __init__(self, provider=query_provider, clock=time.time):
        self.provider, self.clock = provider, clock
        self.lock = threading.Lock()
        self.cache, self.pending, self.calls = OrderedDict(), {}, deque()
        self.day, self.daily = "", 0

    def query(self, kind, value):
        key = (kind, value)
        with self.lock:
            now = self.clock()
            cached = self.cache.get(key)
            if cached and cached[0] > now:
                return 200, cached[1]
            if key in self.pending:
                waiting = self.pending[key]
                owner = False
            else:
                while self.calls and self.calls[0] <= now - 60:
                    self.calls.popleft()
                day = time.strftime("%Y-%m-%d", time.gmtime(now))
                if day != self.day:
                    self.day, self.daily = day, 0
                # Best-effort per-instance budget; the provider also enforces its
                # shared-key daily quota. No automatic provider retry.
                if len(self.calls) >= 120 or self.daily >= 20000:
                    return 429, {"message": "사전 조회가 많아요. 잠시 후 다시 시도해 주세요."}
                if len(self.pending) >= 4:
                    return 503, {"message": "사전을 조회 중이에요. 잠시 후 다시 시도해 주세요."}
                waiting = {"event": threading.Event()}
                self.pending[key] = waiting
                self.calls.append(now)
                self.daily += 1
                owner = True
        if not owner:
            if not waiting["event"].wait(22):
                return 504, {"message": "사전 응답이 지연되고 있어요."}
            return waiting["result"]
        try:
            data = self.provider(kind, value)
            result = (200, data)
            if len(json.dumps(data).encode()) <= 131072:
                with self.lock:
                    self.cache.pop(key, None)
                    self.cache[key] = (self.clock() + 86400, data)
                    while len(self.cache) > 128:
                        self.cache.popitem(last=False)
        except Exception:
            # Do not log provider URLs, credentials, or raw upstream exceptions.
            result = (502, {"message": "사전을 불러오지 못했어요. 잠시 후 다시 검색해 주세요."})
        finally:
            with self.lock:
                waiting["result"] = result
                waiting["event"].set()
                del self.pending[key]
        return result


def handler(dictionary):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def send_json(self, status, data, origin=None):
            body = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=300" if status == 200 else "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Vary", "Origin")
            if origin == ORIGIN:
                self.send_header("Access-Control-Allow-Origin", ORIGIN)
            if status == 429:
                self.send_header("Retry-After", "60")
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            if self.headers.get("Origin") != ORIGIN:
                self.send_json(403, {"message": "허용되지 않은 출처입니다."})
                return
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", ORIGIN)
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Max-Age", "3600")
            self.send_header("Vary", "Origin")
            self.end_headers()

        def do_GET(self):
            origin = self.headers.get("Origin")
            if origin and origin != ORIGIN:
                self.send_json(403, {"message": "허용되지 않은 출처입니다."})
                return
            url = urlsplit(self.path)
            if url.path == "/health":
                self.send_json(200, {"ok": True}, origin)
                return
            kind = {"/api/stdict/search": "search", "/api/stdict/detail": "detail"}.get(url.path)
            if not kind:
                self.send_json(404, {"message": "Not found"}, origin)
                return
            values = parse_qs(url.query)
            value = values.get("code" if kind == "detail" else "q", [""])[0].strip()
            if not re.fullmatch(r"[0-9]{1,12}" if kind == "detail" else r"[가-힣ㄱ-ㅎㅏ-ㅣ ]{1,40}", value):
                self.send_json(400, {"message": "검색어를 확인해 주세요."}, origin)
                return
            status, body = dictionary.query(kind, value)
            self.send_json(status, body, origin)
    return Handler


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), handler(Dictionary())).serve_forever()
