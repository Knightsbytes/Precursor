import http.server
import json
import os
import subprocess
import sys

from config import PORT, ROOT_DIR
import shutil
#Default address is: localhost:8000

class IDEHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="static", **kwargs)

    def _send(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        if self.path == "/tree":
            self._send(self.build_tree(ROOT_DIR))
        else:
            super().do_GET()

    def do_POST(self):

        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length))
        except:
            self.send_response(400)
            self.end_headers()
            return
        if self.path == "/save":
            return self.save_file(data)

        if self.path == "/open":
            return self.open_file(data)

        if self.path == "/run":
            return self.run_file(data)

        if self.path.startswith("/delete"):
            rel = data["path"].lstrip("/\\")
            path = os.path.abspath(os.path.join(ROOT_DIR, rel))
            root = os.path.abspath(ROOT_DIR)

            print("DELETE:", rel)
            print("FULL:", path)

            if not path.startswith(root):
                return self._send({"error": "Invalid path"}, 403)

            if os.path.exists(path):
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)

                return self._send({"status": "deleted"})
            else:
                return self._send({"error": "File not found"}, 404)

    def save_file(self, data):
        root = os.path.abspath(ROOT_DIR)
        full = os.path.abspath(os.path.join(root, data["path"]))

        if os.path.commonpath([full, root]) != root:
            return self._send({"error": "Invalid path"}, 403)

        os.makedirs(os.path.dirname(full), exist_ok=True)

        with open(full, "w", encoding="utf-8") as f:
            f.write(data["content"])

        self._send({"status": "saved"})

    def open_file(self, data):
        root = os.path.abspath(ROOT_DIR)
        full = os.path.abspath(os.path.join(root, data["path"]))

        with open(full, "r", encoding="utf-8") as f:
            self._send({"content": f.read()})

    def run_file(self, data):

        path = os.path.abspath(
            os.path.join(ROOT_DIR, data["path"])
        )

        result = subprocess.run(
            [sys.executable, "-u", path],
            capture_output=True,
            text=True,
            cwd=ROOT_DIR
        )

        self._send({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "code": result.returncode
        })

    def build_tree(self, path, rel=""):
        items = []

        for name in os.listdir(path):
            full = os.path.join(path, name)
            rel_path = os.path.join(rel, name).replace("\\", "/")

            if os.path.isdir(full):
                items.append({
                    "name": name,
                    "type": "folder",
                    "path": rel_path,
                    "children": self.build_tree(full, rel_path)
                })
            else:
                items.append({
                    "name": name,
                    "type": "file",
                    "path": rel_path
                })

        return items

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    os.makedirs(ROOT_DIR, exist_ok=True)
    http.server.HTTPServer(("localhost", PORT), IDEHandler).serve_forever()
