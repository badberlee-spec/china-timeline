"""Build East-Asia base map + China province paths + nine-dash line as SVG paths."""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
NE = json.loads((DATA / "ne_countries.json").read_text(encoding="utf-8"))
CN = json.loads((DATA / "china_raw.json").read_text(encoding="utf-8"))
OUT = DATA / "mapdata.json"

LON0 = 105.0


def proj(lon, lat):
    la = max(-85.0, min(85.0, lat))
    x = math.radians(lon - LON0)
    y = math.log(math.tan(math.pi / 4 + math.radians(la) / 2))
    return x, y

BOX = (60.0, -11.0, 150.0, 56.0)
SKIP = {
    "\u4e2d\u534e\u4eba\u6c11\u5171\u548c\u56fd", "\u4e2d\u534e\u6c11\u56fd",
    "\u6fb3\u5927\u5229\u4e9a", "\u5df4\u5e03\u4e9a\u65b0\u51e0\u5185\u4e9a", "\u6240\u7f57\u95e8\u7fa4\u5c9b",
    "\u4f0a\u6717", "\u6c99\u7279\u963f\u62c9\u4f2f", "\u963f\u66fc", "\u963f\u62c9\u4f2f\u8054\u5408\u914b\u957f\u56fd",
    "\u4e1c\u5e1d\u6c76", "\u65b0\u52a0\u5761",
}


def clip(ring, box=BOX):
    x0, y0, x1, y1 = box

    def edge(pts, inside, cut):
        out = []
        for i, cur in enumerate(pts):
            prev = pts[i - 1]
            ci, pi = inside(cur), inside(prev)
            if ci:
                if not pi:
                    out.append(cut(prev, cur))
                out.append(cur)
            elif pi:
                out.append(cut(prev, cur))
        return out

    def cutx(xv):
        def f(a, b):
            d = b[0] - a[0]
            t = 0 if d == 0 else (xv - a[0]) / d
            return (xv, a[1] + (b[1] - a[1]) * t)
        return f

    def cuty(yv):
        def f(a, b):
            d = b[1] - a[1]
            t = 0 if d == 0 else (yv - a[1]) / d
            return (a[0] + (b[0] - a[0]) * t, yv)
        return f

    pts = ring
    pts = edge(pts, lambda p: p[0] >= x0, cutx(x0))
    if not pts:
        return []
    pts = edge(pts, lambda p: p[0] <= x1, cutx(x1))
    if not pts:
        return []
    pts = edge(pts, lambda p: p[1] >= y0, cuty(y0))
    if not pts:
        return []
    pts = edge(pts, lambda p: p[1] <= y1, cuty(y1))
    return pts


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        seg = math.hypot(dx, dy)
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = math.hypot(px - ax, py - ay) if seg == 0 else abs(dy * px - dx * py + bx * ay - by * ax) / seg
            if d > best:
                best, bi = d, i
        if best > eps and bi > 0:
            keep[bi] = True
            stack.append((a, bi))
            stack.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]


def rings(geom):
    if geom["type"] == "Polygon":
        for r in geom["coordinates"]:
            yield r
    else:
        for poly in geom["coordinates"]:
            for r in poly:
                yield r


def collect(feature, eps):
    out = []
    for r in rings(feature["geometry"]):
        c = clip(r)
        if len(c) < 3:
            continue
        c = rdp(c, eps)
        if len(c) >= 3:
            out.append(c)
    return out


# China provinces (authoritative boundaries)
cn_rings = {}
for f in CN["features"]:
    if f["properties"].get("adcode") == "100000_JD":
        continue
    name = f["properties"]["name"] or ""
    rs = collect(f, 0.018)
    if rs:
        cn_rings[name] = rs

jd_feat = [f for f in CN["features"] if f["properties"].get("adcode") == "100000_JD"][0]
jd_rings = []
for poly in jd_feat["geometry"]["coordinates"]:
    for r in poly:
        c = clip(r)
        if len(c) >= 2:
            jd_rings.append(rdp(c, 0.002))

# World countries (China and Taiwan come from the authoritative DataV layer)
SKIP_WORLD = {"\u4e2d\u534e\u4eba\u6c11\u5171\u548c\u56fd", "\u4e2d\u534e\u6c11\u56fd", "\u5357\u6781\u6d32"}
WORLD_BOX = (-179.5, -59.0, 179.5, 84.0)
world = []
for f in NE["features"]:
    nm = f["properties"].get("NAME_ZH") or f["properties"].get("ADMIN")
    if nm in SKIP_WORLD:
        continue
    rs = []
    for r in rings(f["geometry"]):
        c = clip(r, WORLD_BOX)
        if len(c) < 3:
            continue
        c = rdp(c, 0.07)
        if len(c) >= 3:
            rs.append(c)
    if rs:
        world.append((nm, rs))


def overlaps(rings_, box):
    for r in rings_:
        rxs = [p[0] for p in r]
        rys = [p[1] for p in r]
        if max(rxs) < box[0] or min(rxs) > box[2] or max(rys) < box[1] or min(rys) > box[3]:
            continue
        return True
    return False


frame = []
for nm, rs in world:
    if overlaps(rs, BOX):
        for r in rs:
            c = clip(r, BOX)
            if len(c) >= 3:
                frame.append(c)

all_pts = []
for rs in cn_rings.values():
    for r in rs:
        all_pts.extend(r)
for r in frame:
    all_pts.extend(r)
for r in jd_rings:
    all_pts.extend(r)

xs = [proj(p[0], p[1])[0] for p in all_pts]
ys = [proj(p[0], p[1])[1] for p in all_pts]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
W = 1000.0
SCALE = W / (maxx - minx)
H = (maxy - miny) * SCALE


def tf(lon, lat):
    x, y = proj(lon, lat)
    return (x - minx) * SCALE, (maxy - y) * SCALE


def to_path(pts, close=True):
    parts = []
    for i, (lon, lat) in enumerate(pts):
        sx, sy = tf(lon, lat)
        parts.append(("M" if i == 0 else "L") + f"{sx:.1f},{sy:.1f}")
    if close:
        parts.append("Z")
    return "".join(parts)


provs = [[n, "".join(to_path(r) for r in rs)] for n, rs in cn_rings.items()]
ctrs = [[n, "".join(to_path(r) for r in rs)] for n, rs in world]
jd = [to_path(r, close=False) for r in jd_rings]
islands = [
    [112.33, 16.83], [116.72, 20.70], [117.75, 15.15], [114.40, 15.50],
    [114.36, 10.38], [112.90, 9.50], [111.50, 7.50], [112.28, 3.97],
]

out = {
    "main": {
        "w": round(W, 1), "h": round(H, 1),
        "provinces": provs, "countries": ctrs, "jd": jd, "islands": islands,
    },
    "proj": {"lon0": LON0, "minx": minx, "maxy": maxy, "scale": SCALE},
}

s = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
OUT.write_text(s, encoding="utf-8")
print("bytes", len(s.encode("utf-8")), "provinces", len(provs), "countries", len(ctrs),
      "jd", len(jd), "W", round(W, 1), "H", round(H, 1))
