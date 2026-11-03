import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
GEN = ROOT / "data"

content = json.loads((GEN / "content.json").read_text(encoding="utf-8"))

NEW_EVENTS = [
    {"id": "erdada", "t": "中共二大", "y": 1922, "md": "1922年7月", "lon": 121.47, "lat": 31.23,
     "p": "上海", "period": "xmz", "kind": "geo",
     "d": "二大在上海召开，第一次提出反帝反封建的民主革命纲领，制定第一部党章。",
     "src": "《中国共产党的一百年》第一章", "pts": ["最低纲领", "第一部党章"]},
    {"id": "sandada", "t": "中共三大", "y": 1923, "md": "1923年6月", "lon": 113.26, "lat": 23.13,
     "p": "广东", "period": "xmz", "kind": "geo",
     "d": "三大在广州召开，决定共产党员以个人身份加入国民党，建立革命统一战线。",
     "src": "《中国共产党的一百年》第二章", "pts": ["国共合作方针", "统一战线"]},
    {"id": "sanzhong2024", "t": "二十届三中全会", "y": 2024, "md": "2024年7月15—18日", "lon": 116.40, "lat": 39.90,
     "p": "北京", "period": "xs", "kind": "geo",
     "d": "审议通过《关于进一步全面深化改革、推进中国式现代化的决定》，提出到2029年完成改革任务。",
     "src": "《决定》及新闻发布会", "pts": ["进一步全面深化改革", "总目标", "六个坚持"]},
    {"id": "sizhong2025", "t": "二十届四中全会", "y": 2025, "md": "2025年10月20—23日", "lon": 116.42, "lat": 39.92,
     "p": "北京", "period": "xs", "kind": "geo",
     "d": "审议通过《关于制定国民经济和社会发展第十五个五年规划的建议》，共15个部分、61条。",
     "src": "《建议》及新闻发布会", "pts": ["十五五规划建议", "三大板块", "主要目标"]},
    {"id": "shengli80", "t": "抗战胜利80周年", "y": 2025, "md": "2025年9月3日", "lon": 116.38, "lat": 39.88,
     "p": "北京", "period": "xs", "kind": "geo",
     "d": "纪念中国人民抗日战争暨世界反法西斯战争胜利80周年大会在天安门广场举行，并举行阅兵。",
     "src": "纪念大会讲话", "pts": ["伟大抗战精神", "历史启迪"]},
    {"id": "lianghui2026", "t": "2026年全国两会", "y": 2026, "md": "2026年3月", "lon": 116.44, "lat": 39.94,
     "p": "北京", "period": "xs", "kind": "geo",
     "d": "审查批准\"十五五\"规划纲要，通过生态环境法典、民族团结进步促进法、国家发展规划法；GDP预期增长4.5%—5%。",
     "src": "政府工作报告、规划纲要", "pts": ["十五五纲要", "三部法律", "正确政绩观"]}
]

existing = {e["id"] for e in content["events"]}
for ev in NEW_EVENTS:
    if ev["id"] not in existing:
        content["events"].append(ev)

files = ["quiz_p%d.json" % i for i in range(1, 8)] + [
    "quiz_subj_modern.json", "quiz_subj_party.json", "quiz_subj_doc.json",
    "quiz_subj_modern2.json", "quiz_subj_party2.json", "quiz_subj_doc2.json",
    "quiz_2026.json",
]

have = {q["id"] for q in content["quiz"]}
added = 0
for name in files:
    p = GEN / name
    if not p.exists():
        continue
    for q in json.loads(p.read_text(encoding="utf-8"))["quiz"]:
        if q["id"] not in have:
            content["quiz"].append(q)
            have.add(q["id"])
            added += 1

ids = [q["id"] for q in content["quiz"]]
assert len(ids) == len(set(ids)), "duplicate ids"
ev_ids = {e["id"] for e in content["events"]}
for q in content["quiz"]:
    assert q["ev"] in ev_ids, "orphan " + q["id"]
    if q.get("type", "choice") == "choice":
        assert len(q["o"]) == 4, "options " + q["id"]
        assert 0 <= q["a"] < 4, "answer " + q["id"]
    else:
        assert isinstance(q["a"], list) and len(q["a"]) >= 2, "answer list " + q["id"]

(GEN / "content.json").write_text(
    json.dumps(content, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

print("added", added, "events", len(content["events"]), "quiz", len(content["quiz"]))
by_type = {}
for q in content["quiz"]:
    by_type[q.get("type", "choice")] = by_type.get(q.get("type", "choice"), 0) + 1
print(by_type)
