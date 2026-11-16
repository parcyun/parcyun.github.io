import http.client
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer
from server import Dictionary, handler, normalize_search, normalize_detail, xml_value, query_provider
from unittest.mock import patch
import xml.etree.ElementTree as ET


class DictionaryTests(unittest.TestCase):
    def test_provider_empty_object_is_a_valid_no_result(self):
        with patch.dict("os.environ", {"STDICT_API_KEY": "a" * 32}), patch("server.urlopen") as upstream:
            upstream.return_value.__enter__.return_value.read.return_value = b"{}"
            self.assertEqual(query_provider("search", "없는낱말"), {"total": 0, "items": []})

    def test_search_and_empty(self):
        self.assertEqual(normalize_search({"channel": {"total": 0}}), {"total": 0, "items": []})
        result = normalize_search({"channel": {"total": "1", "item": {"word": "갈퀴", "target_code": 12, "sense": {"definition": "도구"}}}})
        self.assertEqual(result["items"][0]["code"], "12")

    def test_search_retains_complete_chinese_and_foreign_origins(self):
        for origin in ["學校", "computer", "敎育computer", "café au lait"]:
            result = normalize_search({"channel": {"total": 1, "item": {"word": "표제어", "target_code": 1, "origin": origin}}})
            self.assertEqual(result["items"][0]["origin"], origin)

    def test_detail_preserves_every_original_language_component(self):
        parts = [{"original_language": "敎育", "language_type": "한자"}, {"original_language": "computer", "language_type": "영어"}, {"original_language": "Schule", "language_type": "독일어"}]
        result = normalize_detail({"channel": {"item": {"word_info": {"word": "혼종어", "original_language_info": parts}}}})
        self.assertEqual(result["origins"], [{"text": p["original_language"], "language": p["language_type"]} for p in parts])
        self.assertEqual(result["origin"], "敎育, computer, Schule")

    def test_detail_handles_single_and_repeated_xml_and_omits_copyright_examples(self):
        xml = '<channel><item><word_info><word>갈퀴</word><pronunciation_info><pronunciation>갈퀴</pronunciation></pronunciation_info><pos_info><pos>명사</pos><comm_pattern_info><sense_info><definition>도구</definition><example_info><example>낙엽을 모았다.</example></example_info><example_info><example>문학 용례</example><source>저작물</source></example_info></sense_info><sense_info><definition>두 번째 뜻</definition></sense_info></comm_pattern_info></pos_info></word_info></item></channel>'
        result = normalize_detail({"channel": xml_value(ET.fromstring(xml))})
        self.assertEqual(result["pronunciation"], ["갈퀴"])
        self.assertEqual(len(result["groups"][0]["senses"]), 2)
        self.assertEqual(result["groups"][0]["senses"][0]["examples"], ["낙엽을 모았다."])

    def test_cache_expiry_and_bounded_size(self):
        now = [0]
        count = [0]
        def provider(*_):
            count[0] += 1
            return {"total": 0, "items": []}
        d = Dictionary(provider, lambda: now[0])
        d.query("search", "갈퀴")
        d.query("search", "갈퀴")
        self.assertEqual(count[0], 1)
        for i in range(130):
            now[0] += 61
            d.query("detail", str(i))
        self.assertEqual(len(d.cache), 128)
        now[0] += 86401
        d.query("search", "갈퀴")
        self.assertEqual(count[0], 132)

    def test_error_never_leaks_upstream_secret(self):
        def provider(*_):
            raise ValueError("https://upstream/?key=private")
        status, data = Dictionary(provider).query("search", "갈퀴")
        self.assertEqual(status, 502)
        self.assertNotIn("private", str(data))

    def test_deduplicates_concurrent_requests(self):
        entered, release = threading.Event(), threading.Event()
        calls = []
        def provider(*_):
            calls.append(1)
            entered.set()
            release.wait(2)
            return {"items": []}
        d = Dictionary(provider)
        with ThreadPoolExecutor(2) as pool:
            first = pool.submit(d.query, "search", "갈퀴")
            entered.wait(2)
            second = pool.submit(d.query, "search", "갈퀴")
            release.set()
            self.assertEqual(first.result(), second.result())
        self.assertEqual(len(calls), 1)

    def test_rate_limits_uncached_calls(self):
        d = Dictionary(lambda *_: {"items": []}, lambda: 100)
        for i in range(120):
            self.assertEqual(d.query("detail", str(i))[0], 200)
        self.assertEqual(d.query("detail", "new")[0], 429)
        self.assertEqual(d.query("detail", "0")[0], 200)

    def test_http_validation_cors_and_routes(self):
        calls = []
        def provider(*args):
            calls.append(args)
            return {"total": 0, "items": []}
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler(Dictionary(provider)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        def get(path, origin=None, method="GET"):
            conn = http.client.HTTPConnection(*server.server_address)
            conn.request(method, path, headers={"Origin": origin} if origin else {})
            response = conn.getresponse()
            result = response.status, dict(response.getheaders()), response.read()
            conn.close()
            return result
        try:
            self.assertEqual(get("/api/stdict/search?q=x")[0], 400)
            self.assertEqual(get("/api/stdict/search?q=x", "https://bad.example")[0], 403)
            self.assertEqual(get("/other")[0], 404)
            self.assertEqual(get("/api/stdict/search", "https://parcyun.github.io", "OPTIONS")[0], 204)
            response = get("/api/stdict/search?q=%EA%B0%88%ED%80%B4", "https://parcyun.github.io")
            self.assertEqual(response[0], 200)
            self.assertEqual(response[1]["Access-Control-Allow-Origin"], "https://parcyun.github.io")
            self.assertEqual(len(calls), 1)
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
