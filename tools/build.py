"""Bundle data/*.json into client.js (the artifact the browser loads)."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

src = (ROOT / "client.src.js").read_text(encoding="utf-8")
mapj = (DATA / "mapdata.json").read_text(encoding="utf-8").strip()
dataj = (DATA / "content.json").read_text(encoding="utf-8").strip()
eraj = (DATA / "era.json").read_text(encoding="utf-8").strip()

out = src.replace("__MAP__", mapj, 1).replace("__CONTENT__", dataj, 1).replace("__ERA__", eraj, 1)
(ROOT / "client.js").write_text(out, encoding="utf-8")
print("client.js bytes", len(out.encode("utf-8")))
