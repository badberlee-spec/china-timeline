/* China-timeline: a map + timeline drill panel for DSH. */
window.__ModuleLoader__.load({
  id: 'dsh-china-timeline',
  factory(require) {
    'use strict';
    var React = require('react');
    var h = React.createElement;
    var useState = React.useState;
    var useMemo = React.useMemo;
    var useEffect = React.useEffect;
    var useRef = React.useRef;

    var MAP = __MAP__;
    var DATA = __CONTENT__;
    var ERA = __ERA__;

    var PERIODS = {
      qing: { t: '\u665a\u6e05', s: '\u665a\u6e05', c: '#8a6a3f' },
      rep:  { t: '\u6c11\u56fd\u521d\u5e74', s: '\u6c11\u56fd\u521d', c: '#a5762c' },
      xmz:  { t: '\u65b0\u6c11\u4e3b\u4e3b\u4e49\u9769\u547d', s: '\u571f\u5730\u9769\u547d', c: '#b0463b' },
      kz:   { t: '\u6297\u65e5\u6218\u4e89', s: '\u6297\u6218', c: '#a8321f' },
      jf:   { t: '\u89e3\u653e\u6218\u4e89', s: '\u89e3\u653e', c: '#c0662a' },
      xd:   { t: '\u793e\u4f1a\u4e3b\u4e49\u9769\u547d\u548c\u5efa\u8bbe', s: '\u5efa\u56fd\u540e', c: '#7a5ea8' },
      gg:   { t: '\u6539\u9769\u5f00\u653e', s: '\u6539\u9769', c: '#2f7d6b' },
      xs:   { t: '\u65b0\u65f6\u4ee3', s: '\u65b0\u65f6\u4ee3', c: '#2f6fb0' },
      doc:  { t: '\u7ecf\u5178\u6587\u732e', s: '\u6587\u732e', c: '#6b7280' }
    };
    var ORDER = ['qing', 'rep', 'xmz', 'kz', 'jf', 'xd', 'gg', 'xs', 'doc'];
    var COLOR = {};
    ORDER.forEach(function (k) { COLOR[k] = PERIODS[k].c; });

    var MW = MAP.main.w, MH = MAP.main.h;
    var P = MAP.proj;
    var Y0 = 1838, Y1 = 2026;

    function proj(lon, lat) {
      var la = Math.max(-85, Math.min(85, lat));
      var x = (lon - P.lon0) * Math.PI / 180;
      var y = Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360));
      return [(x - P.minx) * P.scale, (P.maxy - y) * P.scale];
    }
    function normName(n) {
      return String(n || '').replace(/(\u7701|\u5e02|\u81ea\u6cbb\u533a|\u7279\u522b\u884c\u653f\u533a|\u58ee\u65cf|\u56de\u65cf|\u7ef4\u543e\u5c14)/g, '');
    }

    function bigramSet(s) {
      var m = {};
      var t = String(s || '').replace(/[\s\u3000，。、；：""''（）()《》〈〉·—…,.;:!?！？\-_/\\]/g, '');
      for (var i = 0; i < t.length - 1; i++) m[t.slice(i, i + 2)] = 1;
      return m;
    }
    function pointCoverage(point, userSet) {
      var pb = bigramSet(point);
      var keys = Object.keys(pb);
      if (!keys.length) return 0;
      var hit = 0;
      for (var i = 0; i < keys.length; i++) { if (userSet[keys[i]]) hit++; }
      return hit / keys.length;
    }
    function gradeAnswer(q, text) {
      var u = bigramSet(text);
      var hits = [], miss = [];
      (q.a || []).forEach(function (p) {
        if (pointCoverage(p, u) >= 0.2) hits.push(p);
        else miss.push(p);
      });
      var total = (q.a || []).length || 1;
      var pct = Math.round(hits.length / total * 100);
      var level = pct >= 60 ? '\u9ad8' : (pct >= 30 ? '\u4e2d' : '\u4f4e');
      if (String(text || '').replace(/\s/g, '').length < 8) level = '\u4f4e';
      return { hits: hits, miss: miss, pct: pct, level: level };
    }

    var EVENTS = DATA.events;
    var QUIZ = DATA.quiz;
    var BY_ID = {};
    EVENTS.forEach(function (e) { BY_ID[e.id] = e; });
    var Q_BY_EV = {};
    QUIZ.forEach(function (q) { (Q_BY_EV[q.ev] = Q_BY_EV[q.ev] || []).push(q); });

    var GEO = EVENTS.filter(function (e) { return e.kind === 'geo'; });
    var DOC = EVENTS.filter(function (e) { return e.kind === 'doc'; });

    var LS_KEY = 'china-timeline:answers';
    var DAILY_KEY = 'china-timeline:daily';
    function loadAnswers() {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function saveAnswers(a) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch (e) {}
    }
    function loadDaily() {
      try { return JSON.parse(localStorage.getItem(DAILY_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function bumpDaily() {
      try {
        var d = new Date();
        var k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        var m = loadDaily();
        m[k] = (m[k] || 0) + 1;
        localStorage.setItem(DAILY_KEY, JSON.stringify(m));
      } catch (e) {}
    }

    function Stat(_ref) {
      var value = _ref.value, label = _ref.label, color = _ref.color;
      return h('div', { className: 'cn-stat' },
        h('b', { style: color ? { color: color } : null }, value),
        h('span', null, label));
    }

    function Icon(props) {
      var size = typeof props.size === 'number' && props.size > 0 ? props.size : 16;
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
        style: { display: 'block', color: props.active === true ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)' }
      },
        h('path', { key: 'a', d: 'M4 18.5l2.4-11 4.1 3.2 3.6-5.2 5.9 5.1' }),
        h('circle', { key: 'b', cx: 9.2, cy: 14.4, r: 1.15, fill: 'currentColor', stroke: 'none' }),
        h('circle', { key: 'c', cx: 15.4, cy: 11.2, r: 1.15, fill: 'currentColor', stroke: 'none' })
      );
    }

    var CSS = [
      '.cn-root{height:100%;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5;position:relative}',
      '.cn-head{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}',
      '.cn-title{font-size:14px;font-weight:600}',
      '.cn-sub{color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.cn-stats{margin-left:auto;display:flex;gap:16px}',
      '.cn-stat{display:flex;flex-direction:column;align-items:flex-end;line-height:1.15}',
      '.cn-stat b{font-size:15px;font-weight:600}',
      '.cn-stat span{font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.cn-filter{display:flex;gap:6px;flex-wrap:wrap;padding:6px 14px 0;flex:none}',
      '.cn-chip{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:2px 9px;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}',
      '.cn-chip i{width:7px;height:7px;border-radius:50%;display:inline-block}',
      '.cn-chip.on{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.cn-tl{padding:2px 14px 0;flex:none}',
      '.cn-tl svg{display:block;width:100%;height:86px}',
      '.cn-body{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;padding:4px 14px 12px}',
      '.cn-map{max-width:100%;max-height:100%;width:auto;height:auto;display:block}',
      '.cn-prov{transition:fill .18s ease,stroke .18s ease}',
      '.cn-dot{cursor:pointer;transition:stroke .12s ease,opacity .12s ease}',
      '.cn-dot:hover{stroke:#fff}',
      '.cn-card{position:absolute;right:14px;top:10px;bottom:10px;width:306px;max-width:44%;overflow:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:12px;box-shadow:0 6px 24px rgba(0,0,0,.16);z-index:3}',
      '.cn-card h3{margin:6px 0 2px;font-size:15px;font-weight:600}',
      '.cn-meta{color:var(--dsw-alias-label-secondary);font-size:12px;margin-bottom:6px}',
      '.cn-desc{font-size:12.5px;margin:6px 0 10px}',
      '.cn-tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;margin:0 4px 4px 0;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
      '.cn-btn{width:100%;margin-top:8px;padding:7px 10px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;background:var(--dsw-alias-brand-primary);color:#fff}',
      '.cn-btn:hover{filter:brightness(1.08)}',
      '.cn-btn.ghost{background:transparent;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2)}',
      '.cn-btn:disabled{opacity:.5;cursor:default}',
      '.cn-hint{position:absolute;left:18px;bottom:38px;color:var(--dsw-alias-label-secondary);font-size:12px;z-index:2}',
      '.cn-quiz{position:absolute;left:0;right:0;top:12%;bottom:14%;margin:0 auto;width:min(720px,94%);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:13px 16px;display:flex;flex-direction:column;z-index:5;box-shadow:0 12px 44px rgba(0,0,0,.24)}',
      '.cn-qhead{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.cn-qhead b{color:var(--dsw-alias-label-primary);font-size:13px}',
      '.cn-q{font-size:15px;font-weight:600;margin:12px 0 12px;line-height:1.55}',
      '.cn-opts{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;padding-right:2px}',
      '.cn-opt{flex:1;display:flex;align-items:center;gap:10px;text-align:left;padding:8px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;font-size:13.5px;line-height:1.45;min-height:40px}',
      '.cn-opt:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.cn-opt.ok{border-color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent)}',
      '.cn-opt.no{border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent)}',
      '.cn-why{margin-top:10px;padding:9px 11px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:12.5px;color:var(--dsw-alias-label-secondary)}',
      '.cn-foot{margin-top:auto;display:flex;gap:8px;padding-top:10px}',
      '.cn-foot .cn-btn{width:auto;margin-top:0;padding:7px 16px}',
      '.cn-score{font-size:28px;font-weight:700;margin:10px 0 2px}',
      '.cn-southlabel{font-size:11px;fill:var(--dsw-alias-label-secondary)}',
      '.cn-map{cursor:grab;touch-action:none;user-select:none}',
      '.cn-map:active{cursor:grabbing}',
      '.cn-zoom{position:absolute;left:18px;top:12px;display:flex;flex-direction:column;gap:4px;z-index:4}',
      '.cn-zoom button{width:28px;height:28px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
      '.cn-zoom button:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.cn-zoomlv{font-size:10px;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums}',
      '.cn-legend{position:absolute;left:18px;bottom:10px;display:flex;flex-wrap:wrap;gap:7px;z-index:2;max-width:64%;pointer-events:none}',
      '.cn-lg{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.cn-lg i{width:8px;height:8px;border-radius:2px;display:inline-block}',
      '.cn-era{display:flex;align-items:center;gap:10px;padding:0 16px 4px;flex:none}',
      '.cn-era input[type=range]{flex:1;min-width:120px;accent-color:var(--dsw-alias-brand-primary);height:18px;cursor:pointer}',
      '.cn-era-year{font-variant-numeric:tabular-nums;font-size:13px;font-weight:600;min-width:44px;text-align:right}',
      '.cn-era-label{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42%}',
      '.cn-step{display:flex;align-items:center;justify-content:center;gap:10px;padding:0 14px 4px;flex:none}',
      '.cn-stepbtn{width:30px;height:22px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
      '.cn-stepbtn:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.cn-stepname{font-size:12px;color:var(--dsw-alias-label-secondary);min-width:120px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42%}',
      '.cn-tl-float .cn-step{padding:2px 0 4px}',
      '.cn-full .cn-body{padding:0}',
      '.cn-root:fullscreen{width:100%;height:100%;background:var(--dsw-alias-bg-base)}',
      '.cn-full .cn-zoom{top:84px}',
      '.cn-modebtn{top:48px}',
      '.cn-full .cn-map{max-width:100%;max-height:100%}',
      '.cn-exit{position:absolute;left:18px;top:12px;z-index:6;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer}',      '.cn-exit:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.cn-era-float{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:min(560px,60%);padding:6px 14px;z-index:6;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;box-shadow:0 8px 26px rgba(0,0,0,.3)}',
      '.cn-tl-float{position:absolute;left:50%;top:10px;transform:translateX(-50%);width:min(920px,86%);z-index:5;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:4px 12px 0;box-shadow:0 10px 30px rgba(0,0,0,.3)}',
      '.cn-tl-float .cn-tl{padding:0}',
      '.cn-vtl-wrap{position:absolute;right:12px;top:14px;bottom:14px;width:106px;z-index:5;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:6px 4px;box-shadow:0 10px 30px rgba(0,0,0,.3)}',
      '.cn-vtl{height:100%;display:flex;justify-content:center;overflow:hidden}',
      '.cn-vtl svg{display:block}',
      '.cn-full .cn-card{top:124px;right:14px;bottom:14px}',
      '.cn-full .cn-legend{left:18px;top:162px;bottom:auto;flex-direction:column;flex-wrap:nowrap;gap:5px;max-width:160px}',
      '.cn-full .cn-hint{display:none}',
      '.cn-tip{position:fixed;z-index:40;pointer-events:none;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 9px;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:260px}',
      '.cn-tip-t{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary);line-height:1.3}',
      '.cn-tip-s{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:2px}',
      '.cn-drill{z-index:6}',
      '.cn-drill-list{display:flex;flex-direction:column;gap:7px;margin-top:10px;padding-right:4px}',
      '.cn-subj{text-align:left;padding:11px 13px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;font-size:13px;transition:background .15s ease,border-color .15s ease}',
      '.cn-subj:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}',
      '.cn-subj-empty{opacity:.5;cursor:default}',
      '.cn-subj-empty:hover{background:transparent;border-color:var(--dsw-alias-border-l1)}',
      '.cn-subj-t{font-size:15px;font-weight:600}',
      '.cn-subj-s{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:3px}',
      '.cn-bar{height:4px;border-radius:2px;background:var(--dsw-alias-border-l1);margin-top:9px;overflow:hidden}',
      '.cn-bar i{display:block;height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary)}',
      '.cn-subj-p{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:6px}',
      '.cn-drill-done{display:flex;flex-direction:column;flex:1;min-height:0;overflow:auto}',
      '.cn-drill-wrong{margin-top:2px}',
      '.cn-mistake{padding:10px 11px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);margin-bottom:8px}',
      '.cn-mistake .mq{font-size:13px;font-weight:600;margin-bottom:5px}',
      '.cn-mistake .ma{font-size:12.5px;color:var(--dsw-alias-state-success-primary);margin-bottom:3px}',
      '.cn-mistake .mw{font-size:12.5px;color:var(--dsw-alias-label-secondary)}',
      '.cn-ans{margin:10px 0 0;padding:10px 14px 10px 28px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:13px;line-height:1.65}',
      '.cn-ans li{margin:3px 0}',
      '.cn-self{display:flex;gap:8px;margin-top:12px}',
      '.cn-self .cn-btn{flex:1;width:auto;margin-top:0}',
      '.cn-ans-input{flex:none;width:100%;min-height:88px;max-height:180px;resize:vertical;margin:0 0 10px;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.6;outline:none;font-family:inherit;box-sizing:border-box}',
      '.cn-ans-input:focus{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.cn-grade{display:flex;align-items:center;gap:6px;font-size:12.5px;margin-bottom:8px;color:var(--dsw-alias-label-secondary)}',
      '.cn-grade b{font-size:14px;padding:1px 8px;border-radius:6px;font-weight:600}',
      '.cn-grade-hi b{color:var(--dsw-alias-state-success-primary);border:1px solid var(--dsw-alias-state-success-primary)}',
      '.cn-grade-mid b{color:var(--dsw-alias-state-warn-primary);border:1px solid var(--dsw-alias-state-warn-primary)}',
      '.cn-grade-lo b{color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-state-error-primary)}',
      '.cn-hit-t,.cn-miss-t{font-size:11.5px;margin:8px 0 2px;color:var(--dsw-alias-label-secondary)}',
      '.cn-ans-miss{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}',
      '.cn-crumb{display:flex;align-items:center;gap:1px;font-size:12px;color:var(--dsw-alias-label-secondary);min-width:0;overflow:hidden}',
      '.cn-crumb button{border:none;background:none;color:inherit;padding:0 2px;cursor:pointer;font-size:12px;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis}',
      '.cn-crumb button:hover{color:var(--dsw-alias-label-primary)}',
      '.cn-crumb button.cur{color:var(--dsw-alias-label-primary)}',
      '.cn-crumb b{color:var(--dsw-alias-label-primary);font-weight:600;white-space:nowrap}',
      '.cn-qcount{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.cn-stage{position:relative;flex:1;min-height:0;overflow:hidden}',
      '.cn-track{display:flex;width:300%;height:100%;transition:transform .24s cubic-bezier(.22,.61,.36,1);will-change:transform}',
      '.cn-page{width:33.3333%;height:100%;flex:none;overflow:auto;display:flex;flex-direction:column}',
      '.cn-subj-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}',
      '.cn-subj-n{font-size:15px;font-weight:600;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.cn-run{display:flex;flex-direction:column;flex:1;min-height:0}',
      '.cn-qfixed{flex:none;min-height:64px;max-height:120px;overflow:auto;margin:0 0 10px}',
      '.cn-ans-wrap{flex:1;min-height:0;overflow:auto;padding-right:2px}',
      '.cn-foot-fixed{margin-top:10px;flex:none;align-items:center}',
      '.cn-why-inline{margin:0 10px 0 0;padding:7px 10px;font-size:12.5px;flex:1;min-width:0;max-height:64px;overflow:auto}',
      '.cn-opt-k{flex:none;width:18px;height:18px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.cn-opt.ok .cn-opt-k{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}',
      '.cn-opt.no .cn-opt-k{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}',
      '.cn-opt-t{flex:1;min-width:0}',
      '.cn-search{position:relative;flex:none}',
      '.cn-search input{width:150px;height:24px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);padding:0 10px;font-size:12px;outline:none}',
      '.cn-search input:focus{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.cn-search-list{position:absolute;right:0;top:28px;min-width:210px;max-height:240px;overflow:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:20;padding:4px}',
      '.cn-search-item{display:flex;justify-content:space-between;gap:10px;width:100%;border:none;background:transparent;color:var(--dsw-alias-label-primary);padding:6px 8px;border-radius:6px;cursor:pointer;font-size:12px;text-align:left}',
      '.cn-search-item:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.cn-si-y{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;flex:none}',
      '.cn-search-empty{padding:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.cn-cardbar{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.cn-mini{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:2px 8px;font-size:11px;cursor:pointer;flex:none}',
      '.cn-mini:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
      '.cn-mini:disabled{opacity:.35;cursor:default;border-color:var(--dsw-alias-border-l1)}',
      '.cn-nav{margin-left:auto;display:flex;align-items:center;gap:6px}',
      '.cn-nav-n{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;min-width:56px;text-align:center}',
      '.cn-card-min{bottom:auto;max-height:none}',
      '.cn-stats{z-index:7}',
      '.cn-stats-body{overflow:auto;padding-right:4px;margin-top:8px}',
      '.cn-stats-top{display:flex;gap:22px;margin-bottom:10px}',
      '.cn-stats-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin:12px 0 6px}',
      '.cn-statrow{margin-bottom:8px}',
      '.cn-statrow-h{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px}',
      '.cn-statrow-n{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.cn-days{display:flex;gap:8px;align-items:flex-end;height:84px;margin-top:4px}',
      '.cn-day{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end}',
      '.cn-day-bar{flex:1;width:100%;display:flex;align-items:flex-end}',
      '.cn-day-bar i{display:block;width:100%;min-height:2px;border-radius:3px 3px 0 0;background:var(--dsw-alias-brand-primary);opacity:.8}',
      '.cn-day-n{font-size:10.5px;color:var(--dsw-alias-label-secondary)}',
      '.cn-day-l{font-size:10px;color:var(--dsw-alias-label-secondary);opacity:.8}',
      '.cn-mask{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:30}',
      '.cn-dialog{width:min(330px,86%);background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:16px;box-shadow:0 16px 40px rgba(0,0,0,.4)}',
      '.cn-dialog-t{font-size:14px;font-weight:600;margin-bottom:6px;color:var(--dsw-alias-label-primary)}',
      '.cn-dialog-s{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.55}',
      '.cn-dialog-b{display:flex;gap:8px;margin-top:14px}',
      '.cn-dialog-b .cn-btn{flex:1;width:auto;margin-top:0}',
      '.cn-drill{animation:cnDrillIn .18s ease-out both}',
      '@keyframes cnDrillIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion: reduce){.cn-track{transition:none}.cn-drill{animation:none}}'
    ].join('\n');

    function Timeline(_ref) {
      var selected = _ref.selected, onPick = _ref.onPick, filter = _ref.filter;
      var eraOn = _ref.eraOn, eraYear = _ref.eraYear, onYearChange = _ref.onYearChange;
      var range = _ref.range, onRange = _ref.onRange;
      var boxRef = useRef(null);
      var svgEl = useRef(null);
      var dragYear = useRef(false);
      var yearCb = useRef(onYearChange);
      yearCb.current = onYearChange;
      var _w = useState(1000), W = _w[0], setW = _w[1];
      useEffect(function () {
        var el = boxRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        var ro = new ResizeObserver(function (es) {
          var width = es[0] && es[0].contentRect ? es[0].contentRect.width : 0;
          if (width > 200) setW(width);
        });
        ro.observe(el);
        return function () { ro.disconnect(); };
      }, []);
      useEffect(function () {
        function move(e) {
          if (!dragYear.current) return;
          var el = svgEl.current;
          if (!el) return;
          var r = el.getBoundingClientRect();
          if (!r.width) return;
          var x = (e.clientX - r.left) / r.width * W;
          var yr = Math.round(ra() + ((x - 16) / (W - 32)) * (rb() - ra()));
          yr = Math.max(ra(), Math.min(rb(), yr));
          if (yearCb.current) yearCb.current(yr);
        }
        function up() { dragYear.current = false; }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return function () {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
      }, [W, range]);
      var H = 86, base = 62;
      function ra() { return range ? range.a : Y0; }
      function rb() { return range ? range.b : Y1; }
      var sorted = useMemo(function () {
        return EVENTS.slice().sort(function (a, b) { return a.y - b.y; });
      }, []);
      var bands = useMemo(function () {
        var spans = ORDER.map(function (k) {
          var ys = EVENTS.filter(function (e) { return e.period === k; }).map(function (e) { return e.y; });
          return { k: k, a: Math.min.apply(null, ys), b: Math.max.apply(null, ys) };
        });
        return spans;
      }, []);
      var span = rb() - ra();
      var step = span > 90 ? 20 : (span > 45 ? 10 : 5);
      var ticks = [];
      for (var y = Math.ceil(ra() / step) * step; y <= rb(); y += step) ticks.push(y);
      var tpad = 16;
      function px(year) { return tpad + (year - ra()) / (rb() - ra()) * (W - tpad * 2); }

      return h('div', { className: 'cn-tl', ref: boxRef },
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, preserveAspectRatio: 'none', ref: svgEl },
          h('line', { key: 'axis', x1: 16, y1: base, x2: W - 16, y2: base, stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1 }),
          bands.map(function (b) {
            var x1 = px(b.a), x2 = px(b.b);
            var on = filter === 'all' || filter === b.k;
            return h('rect', {
              key: 'band-' + b.k, x: x1, y: base - 3, width: Math.max(3, x2 - x1), height: 6, rx: 2,
              fill: COLOR[b.k], opacity: on ? 0.85 : 0.22,
              style: { cursor: 'pointer' },
              onClick: function () {
                if (!onRange) return;
                if (range && range.k === b.k) onRange(null);
                else onRange({ a: Math.max(Y0, b.a - 1), b: Math.min(Y1, b.b + 1), k: b.k });
              }
            }, h('title', null, '\u53ea\u770b ' + PERIODS[b.k].t));
          }),
          ticks.map(function (t) {
            var x = px(t);
            return h('g', { key: 't' + t },
              h('line', { x1: x, y1: base, x2: x, y2: base + 5, stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1 }),
              h('text', { x: x, y: base + 18, fontSize: 11, textAnchor: 'middle', fill: 'var(--dsw-alias-label-secondary)' }, String(t)));
          }),
          sorted.map(function (e, i) {
            var x = px(e.y);
            var isSel = selected === e.id;
            var dim = filter !== 'all' && filter !== e.period;
            var yy = base - 6 - (i % 3) * 7;
            var shape = e.kind === 'doc'
              ? h('rect', {
                  x: -2.6, y: -2.6, width: 5.2, height: 5.2, transform: 'rotate(45)',
                  fill: isSel ? COLOR[e.period] : 'var(--dsw-alias-bg-base)',
                  stroke: COLOR[e.period], strokeWidth: 1.4
                })
              : h('circle', {
                  r: isSel ? 5 : 3.2, fill: COLOR[e.period],
                  stroke: isSel ? 'var(--dsw-alias-label-primary)' : 'none', strokeWidth: 1.2
                });
            return h('g', {
              key: e.id, transform: 'translate(' + x + ',' + yy + ')',
              opacity: dim ? 0.22 : 1, style: { cursor: 'pointer' },
              onClick: function () { onPick(e.id); }
            },
              h('circle', { r: 9, fill: 'transparent' }),
              shape,
              h('title', null, e.t + '\u00b7' + e.y)
            );
          }),
          eraOn ? h('g', { key: 'playhead' },
            h('line', {
              x1: px(eraYear), y1: 0, x2: px(eraYear), y2: base + 6,
              stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 1.4, opacity: 0.75,
              style: { pointerEvents: 'none' }
            }),
            h('circle', {
              cx: px(eraYear), cy: base, r: 6,
              fill: 'var(--dsw-alias-brand-primary)', stroke: '#fff', strokeWidth: 1.6,
              style: { cursor: 'ew-resize' },
              onPointerDown: function () { dragYear.current = true; }
            }),
            h('title', null, String(eraYear))
          ) : null,
          range ? h('g', {
            key: 'range-reset', style: { cursor: 'pointer' },
            onClick: function () { if (onRange) onRange(null); }
          },
            h('rect', {
              x: W - 54, y: 2, width: 50, height: 17, rx: 8,
              fill: 'var(--dsw-alias-bg-layer-2)', stroke: 'var(--dsw-alias-border-l1)'
            }),
            h('text', {
              x: W - 29, y: 14, fontSize: 10, textAnchor: 'middle',
              fill: 'var(--dsw-alias-label-secondary)'
            }, '\u5168\u90e8')
          ) : null
        )
      );
    }

    function VTimeline(_ref) {
      var selected = _ref.selected, onPick = _ref.onPick, filter = _ref.filter;
      var boxRef = useRef(null);
      var _hh = useState(620), boxH = _hh[0], setBoxH = _hh[1];
      useEffect(function () {
        var el = boxRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        var ro = new ResizeObserver(function (es) {
          var hh = es[0] && es[0].contentRect ? es[0].contentRect.height : 0;
          if (hh > 200) setBoxH(hh);
        });
        ro.observe(el);
        return function () { ro.disconnect(); };
      }, []);
      var W = 98;
      var pad = 16;
      function py(year) { return pad + (year - Y0) / (Y1 - Y0) * (boxH - pad * 2); }
      var bands = useMemo(function () {
        return ORDER.map(function (k) {
          var ys = EVENTS.filter(function (e) { return e.period === k; }).map(function (e) { return e.y; });
          return { k: k, a: Math.min.apply(null, ys), b: Math.max.apply(null, ys) };
        });
      }, []);
      var sorted = useMemo(function () {
        return EVENTS.slice().sort(function (a, b) { return a.y - b.y; });
      }, []);
      var ticks = [];
      for (var y = 1840; y <= 2020; y += 20) ticks.push(y);
      return h('div', { className: 'cn-vtl', ref: boxRef },
        h('svg', { viewBox: '0 0 ' + W + ' ' + boxH, width: W, height: boxH },
          h('line', { x1: 18, y1: py(Y0), x2: 18, y2: py(Y1), stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1 }),
          bands.map(function (b) {
            var on = filter === 'all' || filter === b.k;
            var y1 = py(b.a), y2 = py(b.b);
            return h('rect', { key: 'b' + b.k, x: 15, y: y1, width: 6, height: Math.max(3, y2 - y1), rx: 2, fill: COLOR[b.k], opacity: on ? 0.85 : 0.22 });
          }),
          ticks.map(function (t) {
            var yy = py(t);
            return h('g', { key: 't' + t },
              h('line', { x1: 18, y1: yy, x2: 23, y2: yy, stroke: 'var(--dsw-alias-border-l2)' }),
              h('text', { x: 26, y: yy + 3.4, fontSize: 9.5, fill: 'var(--dsw-alias-label-secondary)' }, String(t))
            );
          }),
          sorted.map(function (e, i) {
            var yy = py(e.y);
            var isSel = selected === e.id;
            var dim = filter !== 'all' && filter !== e.period;
            var cx = 58 + (i % 3) * 13;
            return h('g', {
              key: e.id, opacity: dim ? 0.22 : 1, style: { cursor: 'pointer' },
              onClick: function () { onPick(e.id); }
            },
              h('circle', { cx: cx, cy: yy, r: 8, fill: 'transparent' }),
              e.kind === 'doc'
                ? h('rect', {
                    x: cx - 2.4, y: yy - 2.4, width: 4.8, height: 4.8,
                    transform: 'rotate(45 ' + cx + ' ' + yy + ')',
                    fill: isSel ? COLOR[e.period] : 'var(--dsw-alias-bg-base)',
                    stroke: COLOR[e.period], strokeWidth: 1.2
                  })
                : h('circle', {
                    cx: cx, cy: yy, r: isSel ? 4.6 : 3,
                    fill: COLOR[e.period], stroke: isSel ? '#fff' : 'none', strokeWidth: 1.2
                  }),
              h('title', null, e.t + '\u00b7' + e.y)
            );
          })
        )
      );
    }

    var SUBJECTS = [
      { id: 'wrong', name: '错题本', sub: '做错的题，答对后自动移出', wrong: true },
      { id: 'modern', name: '中国近代史', sub: '1840—1919', periods: ['qing', 'rep'] },
      { id: 'party', name: '中共党史', sub: '1921—2022', periods: ['xmz', 'kz', 'jf', 'xd', 'gg', 'xs'] },
      { id: 'doc', name: '经典文献', sub: '马克思主义党的学说', periods: ['doc'] },
      { id: 'disc', name: '易混辨析', sub: '跨科对比 · 时间排序', periods: [] }
    ];

    var TYPES = [
      { key: 'choice', name: '选择题', hint: '单选，选完即判对错' },
      { key: 'term', name: '名词解释', hint: '先自己过一遍要点，再看参考答案' },
      { key: 'short', name: '简答题', hint: '列要点，对照答案自评' },
      { key: 'essay', name: '论述题', hint: '先搭框架，再看参考要点' }
    ];

    function Drill(_ref) {
      var answers = _ref.answers, onAnswer = _ref.onAnswer, onClose = _ref.onClose, onReset = _ref.onReset;
      var _sub = useState(null), subj = _sub[0], setSubj = _sub[1];
      var _typ = useState(null), type = _typ[0], setType = _typ[1];
      var _run = useState(null), run = _run[0], setRun = _run[1];

      var QM = useMemo(function () {
        var m = {};
        QUIZ.forEach(function (q) { m[q.id] = q; });
        return m;
      }, []);

      var subjects = useMemo(function () {
        return SUBJECTS.map(function (s) {
          var pool = QUIZ.filter(function (q) {
            if (s.wrong) return answers[q.id] === false;
            if (s.id === 'disc') return q.tag === 'disc';
            var ev = BY_ID[q.ev];
            return ev && s.periods.indexOf(ev.period) >= 0 && q.tag !== 'disc';
          });
          var types = TYPES.map(function (t) {
            var ids = pool.filter(function (q) { return (q.type || 'choice') === t.key; })
              .sort(function (a, b) {
                var ya = BY_ID[a.ev] ? BY_ID[a.ev].y : 0;
                var yb = BY_ID[b.ev] ? BY_ID[b.ev].y : 0;
                return ya - yb || (a.id < b.id ? -1 : 1);
              })
              .map(function (q) { return q.id; });
            return { key: t.key, name: t.name, hint: t.hint, ids: ids };
          }).filter(function (t) { return t.ids.length > 0; });
          return { id: s.id, name: s.name, sub: s.sub, types: types };
        });
      }, [answers]);

      function start(t) {
        setType(t);
        setRun({ ids: t.ids, i: 0, picked: null, correct: 0, done: false, wrong: [], revealed: false, ans: {} });
      }
      function score(ans) {
        var correct = 0, wrong = [];
        run.ids.forEach(function (id) {
          if (ans[id] === true) correct++;
          else if (ans[id] === false) wrong.push(id);
        });
        return { correct: correct, wrong: wrong };
      }
      function pick(idx) {
        if (!run || run.picked !== null || run.done) return;
        var q = QM[run.ids[run.i]];
        var ok = idx === q.a;
        var ans = Object.assign({}, run.ans || {});
        ans[q.id] = ok;
        var sc = score(ans);
        setRun(Object.assign({}, run, { ans: ans, picked: idx, correct: sc.correct, wrong: sc.wrong }));
        if (onAnswer) onAnswer(q.id, ok);
      }
      function selfEval(ok) {
        if (!run || run.done || !run.revealed) return;
        var q = QM[run.ids[run.i]];
        var ans = Object.assign({}, run.ans || {});
        ans[q.id] = ok;
        var sc = score(ans);
        var last = run.i + 1 >= run.ids.length;
        setRun(Object.assign({}, run, {
          ans: ans,
          correct: sc.correct,
          wrong: sc.wrong,
          picked: null,
          revealed: false,
          text: '',
          sc: null,
          i: last ? run.i : run.i + 1,
          done: last
        }));
        if (onAnswer) onAnswer(q.id, ok);
      }
      function go(d) {
        if (!run || run.done) return;
        var ni = run.i + d;
        if (ni < 0 || ni >= run.ids.length) return;
        setRun(Object.assign({}, run, { i: ni, picked: null, revealed: false, text: '', sc: null }));
      }
      function next() {
        if (!run) return;
        var ni = run.i + 1;
        if (ni >= run.ids.length) setRun(Object.assign({}, run, { done: true }));
        else setRun(Object.assign({}, run, { i: ni, picked: null }));
      }
      function reveal() {
        if (!run) return;
        var q = QM[run.ids[run.i]];
        setRun(Object.assign({}, run, { revealed: true, sc: gradeAnswer(q, run.text || '') }));
      }
      function onText(ev) {
        if (!run) return;
        var v = ev.target.value;
        var next = Object.assign({}, run, { text: v });
        if (run.revealed) next.sc = gradeAnswer(QM[run.ids[run.i]], v);
        setRun(next);
      }
      function backToTypes() { setType(null); setRun(null); }
      function backToSubjects() { setSubj(null); setType(null); setRun(null); }

      var cur = run && !run.done ? QM[run.ids[run.i]] : null;
      var curType = cur ? (cur.type || 'choice') : 'choice';
      var level = subj ? (type ? 2 : 1) : 0;

      useEffect(function () {
        function onKey(e) {
          if (e.key === 'Escape') { onClose(); return; }
          if (!type || !run || run.done) return;
          var q = QM[run.ids[run.i]];
          var t = (q.type || 'choice');
          if (t === 'choice') {
            if (run.picked === null && /^[1-4]$/.test(e.key)) {
              e.preventDefault();
              pick(Number(e.key) - 1);
            } else if (run.picked !== null && e.key === 'Enter') {
              e.preventDefault();
              next();
            }
          } else {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!run.revealed) reveal();
              else selfEval(true);
            }
          }
        }
        window.addEventListener('keydown', onKey);
        return function () { window.removeEventListener('keydown', onKey); };
      }, [run, type, subj]);

      var crumb = h('div', { className: 'cn-crumb' },
        h('button', { onClick: backToSubjects }, '整合刷题'),
        subj ? h('span', null, ' / ') : null,
        subj ? h('button', { onClick: function () { if (type) backToTypes(); }, className: type ? '' : 'cur' }, subj.name) : null,
        type ? h('span', null, ' / ') : null,
        type ? h('b', null, type.name) : null
      );

      var head = h('div', { className: 'cn-qhead' },
        crumb,
        h('span', { className: 'cn-qcount' },
          run && !run.done ? (run.i + 1) + ' / ' + run.ids.length : ''),
        run && !run.done ? h('div', { className: 'cn-nav' },
          h('button', {
            className: 'cn-mini', title: '上一题', disabled: run.i === 0,
            onClick: function () { go(-1); }
          }, '◀ 上一题'),
          h('button', {
            className: 'cn-mini', title: '下一题', disabled: run.i >= run.ids.length - 1,
            onClick: function () { go(1); }
          }, '下一题 ▶')
        ) : null,
        h('button', { className: 'cn-chip', onClick: onClose }, '退出')
      );

      var pageSubjects = h('div', { className: 'cn-page' },
        h('div', { className: 'cn-drill-list' },
          subjects.map(function (s) {
            var total = s.types.reduce(function (a, t) { return a + t.ids.length; }, 0);
            var ok = 0;
            s.types.forEach(function (t) {
              ok += t.ids.filter(function (id) { return answers[id] === true; }).length;
            });
            var breakdown = s.types.map(function (t) {
              var short = t.key === 'choice' ? '选择' : t.key === 'term' ? '名解' : t.key === 'short' ? '简答' : '论述';
              return t.ids.length + ' ' + short;
            }).join(' · ');
            var empty = total === 0;
            return h('button', {
              key: s.id,
              className: 'cn-subj' + (empty ? ' cn-subj-empty' : ''),
              disabled: empty,
              onClick: function () { if (!empty) setSubj(s); }
            },
              h('div', { className: 'cn-subj-head' },
                h('span', { className: 'cn-subj-t' }, s.name),
                h('span', { className: 'cn-subj-n' }, total)
              ),
              h('div', { className: 'cn-subj-s' }, empty && s.id === 'wrong' ? '还没有错题，去做几道' : (empty ? '暂无题目' : breakdown)),
              h('div', { className: 'cn-bar' }, h('i', { style: { width: (total ? (ok / total * 100) : 0) + '%' } }))
            );
          }),
          onReset ? h('button', {
            className: 'cn-mini', style: { alignSelf: 'flex-start', marginTop: 4 },
            onClick: onReset
          }, '重置全部答题记录') : null
        )
      );

      var pageTypes = h('div', { className: 'cn-page' },
        h('div', { className: 'cn-drill-list' },
          (subj ? subj.types : []).map(function (t) {
            var ok = t.ids.filter(function (id) { return answers[id] === true; }).length;
            return h('button', { key: t.key, className: 'cn-subj', onClick: function () { start(t); } },
              h('div', { className: 'cn-subj-head' },
                h('span', { className: 'cn-subj-t' }, t.name),
                h('span', { className: 'cn-subj-n' }, t.ids.length)
              ),
              h('div', { className: 'cn-subj-s' }, t.hint),
              h('div', { className: 'cn-bar' }, h('i', { style: { width: (t.ids.length ? (ok / t.ids.length * 100) : 0) + '%' } }))
            );
          })
        )
      );

      var runBody;
      if (!run) {
        runBody = null;
      } else if (run.done) {
        runBody = h('div', { className: 'cn-drill-done' },
          h('div', { className: 'cn-score' }, run.correct + ' / ' + run.ids.length),
          h('div', { className: 'cn-meta' }, '掌握率 ' + Math.round(run.correct / run.ids.length * 100) + '%'),
          h('div', { className: 'cn-meta' }, '已作答 ' + Object.keys(run.ans || {}).length + ' / ' + run.ids.length + ' 题'),
          run.wrong.length
            ? h('div', { className: 'cn-drill-wrong' },
                h('div', { className: 'cn-meta', style: { margin: '12px 0 8px' } }, '没掌握 ' + run.wrong.length + ' 道'),
                run.wrong.map(function (id) {
                  var q = QM[id];
                  if ((q.type || 'choice') === 'choice') {
                    return h('div', { key: id, className: 'cn-mistake' },
                      h('div', { className: 'mq' }, q.q),
                      h('div', { className: 'ma' }, '正确答案：' + String.fromCharCode(65 + q.a) + '、' + q.o[q.a]),
                      h('div', { className: 'mw' }, q.why)
                    );
                  }
                  return h('div', { key: id, className: 'cn-mistake' },
                    h('div', { className: 'mq' }, q.q),
                    h('div', { className: 'mw' }, q.a.join('；'))
                  );
                })
              )
            : h('div', { className: 'cn-meta', style: { marginTop: 10 } }, '这一组全掌握了'),
          h('div', { className: 'cn-foot' },
            h('button', { className: 'cn-btn', onClick: function () { start(type); } }, '重做'),
            h('button', { className: 'cn-btn ghost', onClick: backToTypes }, '换个题型')
          )
        );
      } else if (curType !== 'choice') {
        runBody = h('div', { className: 'cn-run cn-run-subj' },
          h('div', { className: 'cn-q cn-qfixed' }, cur.q),
          h('textarea', {
            className: 'cn-ans-input',
            value: run.text || '',
            placeholder: '在这里写你的答案，写完点下面按钮对照要点…',
            onChange: onText
          }),
          h('div', { className: 'cn-ans-wrap' },
            run.revealed && run.sc
              ? h('div', null,
                  h('div', { className: 'cn-grade cn-grade-' + (run.sc.level === '高' ? 'hi' : run.sc.level === '中' ? 'mid' : 'lo') },
                    h('b', null, run.sc.level),
                    h('span', null, ' 要点覆盖 ' + run.sc.pct + '% · ' + run.sc.hits.length + '/' + cur.a.length + ' 条')),
                  run.sc.hits.length ? h('div', { className: 'cn-hit' },
                    h('div', { className: 'cn-hit-t' }, '答到的要点'),
                    h('ul', { className: 'cn-ans' }, run.sc.hits.map(function (t, i) { return h('li', { key: 'h' + i }, t); }))
                  ) : null,
                  run.sc.miss.length ? h('div', { className: 'cn-miss' },
                    h('div', { className: 'cn-miss-t' }, '漏掉的要点（这些该补）'),
                    h('ul', { className: 'cn-ans cn-ans-miss' }, run.sc.miss.map(function (t, i) { return h('li', { key: 'm' + i }, t); }))
                  ) : null,
                  cur.why ? h('div', { className: 'cn-why' }, cur.why) : null
                )
              : h('div', { className: 'cn-meta' }, '先自己写一遍，再点「提交并对照」。对照按要点关键词覆盖率打分，不是逐字判卷。')
          ),
          h('div', { className: 'cn-foot cn-foot-fixed' },
            run.revealed
              ? h('div', { className: 'cn-self' },
                  h('button', { className: 'cn-btn', onClick: function () { selfEval(true); } }, '记住了'),
                  h('button', { className: 'cn-btn ghost', onClick: function () { selfEval(false); } }, '没记住')
                )
              : h('button', { className: 'cn-btn', onClick: reveal }, '提交并对照')
          )
        );
      } else {
        runBody = h('div', { className: 'cn-run' },
          h('div', { className: 'cn-q cn-qfixed' }, cur.q),
          h('div', { className: 'cn-opts' },
            cur.o.map(function (opt, i) {
              var cls = 'cn-opt';
              if (run.picked !== null) {
                if (i === cur.a) cls += ' ok';
                else if (i === run.picked) cls += ' no';
              }
              return h('button', { key: i, className: cls, onClick: function () { pick(i); } },
                h('span', { className: 'cn-opt-k' }, String.fromCharCode(65 + i)),
                h('span', { className: 'cn-opt-t' }, opt));
            })
          ),
          h('div', { className: 'cn-foot cn-foot-fixed' },
            run.picked !== null
              ? h('div', { className: 'cn-why cn-why-inline' }, '答案 ' + String.fromCharCode(65 + cur.a) + '：' + cur.why)
              : null,
            h('button', { className: 'cn-btn', disabled: run.picked === null, onClick: next },
              run.i + 1 >= run.ids.length ? '看结果' : '下一题')
          )
        );
      }

      var pageRun = h('div', { className: 'cn-page' }, runBody);

      return h('div', { className: 'cn-quiz cn-drill' },
        head,
        h('div', { className: 'cn-stage' },
          h('div', {
            className: 'cn-track',
            style: { transform: 'translateX(-' + (level * 33.3333) + '%)' }
          }, pageSubjects, pageTypes, pageRun)
        )
      );
    }

    function Stats(_ref) {
      var answers = _ref.answers, onClose = _ref.onClose, onClear = _ref.onClear;
      var rows = useMemo(function () {
        var defs = [
          { n: '\u4e2d\u56fd\u8fd1\u4ee3\u53f2', ps: ['qing', 'rep'] },
          { n: '\u4e2d\u5171\u515a\u53f2', ps: ['xmz', 'kz', 'jf', 'xd', 'gg', 'xs'] },
          { n: '\u7ecf\u5178\u6587\u732e', ps: ['doc'] },
          { n: '\u6613\u6df7\u8fa8\u6790', tag: true }
        ];
        return defs.map(function (d) {
          var pool = QUIZ.filter(function (qq) {
            if (d.tag) return qq.tag === 'disc';
            var ev = BY_ID[qq.ev];
            return ev && d.ps.indexOf(ev.period) >= 0 && qq.tag !== 'disc';
          });
          var done = 0, ok = 0;
          pool.forEach(function (qq) {
            var a = answers[qq.id];
            if (a !== undefined) { done++; if (a) ok++; }
          });
          return { n: d.n, total: pool.length, done: done, ok: ok };
        });
      }, [answers]);

      var types = useMemo(function () {
        var keys = [['choice', '\u9009\u62e9\u9898'], ['term', '\u540d\u8bcd\u89e3\u91ca'], ['short', '\u7b80\u7b54\u9898'], ['essay', '\u8bba\u8ff0\u9898']];
        return keys.map(function (k) {
          var pool = QUIZ.filter(function (qq) { return (qq.type || 'choice') === k[0]; });
          var done = 0, ok = 0;
          pool.forEach(function (qq) {
            var a = answers[qq.id];
            if (a !== undefined) { done++; if (a) ok++; }
          });
          return { n: k[1], total: pool.length, done: done, ok: ok };
        });
      }, [answers]);

      var daily = useMemo(function () {
        var m = loadDaily();
        var out = [];
        var now = new Date();
        for (var i = 6; i >= 0; i--) {
          var d = new Date(now.getTime() - i * 86400000);
          var k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
          out.push({ label: (d.getMonth() + 1) + '/' + d.getDate(), n: m[k] || 0 });
        }
        return out;
      }, []);

      var doneAll = 0, okAll = 0;
      Object.keys(answers).forEach(function (k) { doneAll++; if (answers[k]) okAll++; });
      var maxDay = Math.max.apply(null, daily.map(function (d) { return d.n; }).concat([1]));

      function row(r) {
        var pct = r.total ? Math.round(r.done / r.total * 100) : 0;
        var acc = r.done ? Math.round(r.ok / r.done * 100) : 0;
        return h('div', { key: r.n, className: 'cn-statrow' },
          h('div', { className: 'cn-statrow-h' },
            h('span', null, r.n),
            h('span', { className: 'cn-statrow-n' }, r.done + ' / ' + r.total + ' \u00b7 ' + acc + '%')
          ),
          h('div', { className: 'cn-bar' }, h('i', { style: { width: pct + '%' } }))
        );
      }

      return h('div', { className: 'cn-quiz cn-stats' },
        h('div', { className: 'cn-qhead' },
          h('b', null, '\u5b66\u4e60\u7edf\u8ba1'),
          h('button', { className: 'cn-chip', style: { marginLeft: 'auto' }, onClick: onClose }, '\u5173\u95ed')
        ),
        h('div', { className: 'cn-stats-body' },
          h('div', { className: 'cn-stats-top' },
            h(Stat, { value: doneAll + '/' + QUIZ.length, label: '\u5df2\u7b54' }),
            h(Stat, { value: (doneAll ? Math.round(okAll / doneAll * 100) : 0) + '%', label: '\u6b63\u786e\u7387', color: 'var(--dsw-alias-state-success-primary)' }),
            h(Stat, { value: QUIZ.length - doneAll, label: '\u672a\u505a' })
          ),
          h('div', { className: 'cn-stats-sub' }, '\u6309\u79d1\u76ee'),
          rows.map(row),
          h('div', { className: 'cn-stats-sub' }, '\u6309\u9898\u578b'),
          types.map(row),
          h('div', { className: 'cn-stats-sub' }, '\u6700\u8fd1\u4e03\u5929'),
          h('div', { className: 'cn-days' },
            daily.map(function (d, i) {
              return h('div', { key: i, className: 'cn-day' },
                h('div', { className: 'cn-day-bar' },
                  h('i', { style: { height: Math.round(d.n / maxDay * 100) + '%' } })
                ),
                h('div', { className: 'cn-day-n' }, String(d.n)),
                h('div', { className: 'cn-day-l' }, d.label)
              );
            })
          ),
          h('div', { style: { marginTop: 16 } },
            h('button', {
              className: 'cn-btn ghost',
              onClick: function () {
                if (onClear && window.confirm('\u786e\u5b9a\u6e05\u7a7a\u6240\u6709\u7b54\u9898\u8bb0\u5f55\uff1f')) onClear();
              }
            }, '\u6e05\u7a7a\u7b54\u9898\u8bb0\u5f55')
          )
        )
      );
    }

    function App() {
      var _s = useState(null), sel = _s[0], setSel = _s[1];
      var _f = useState('all'), filter = _f[0], setFilter = _f[1];
      var _a = useState(loadAnswers), answers = _a[0], setAnswers = _a[1];
      var _q = useState(null), quiz = _q[0], setQuiz = _q[1];
      var _v = useState({ x: 0, y: 0, w: MW, h: MH }), view = _v[0], setView = _v[1];
      var _d = useState(false), drillOpen = _d[0], setDrillOpen = _d[1];
      var _h = useState(null), hover = _h[0], setHover = _h[1];
      var _e = useState(false), eraOn = _e[0], setEraOn = _e[1];
      var _y = useState(1840), eraYear = _y[0], setEraYear = _y[1];
      var _fl = useState(false), full = _fl[0], setFull = _fl[1];
      var _q2 = useState(''), q = _q2[0], setQ = _q2[1];
      var _tr = useState(null), tlRange = _tr[0], setTlRange = _tr[1];
      var _co = useState(true), cardOpen = _co[0], setCardOpen = _co[1];
      var _st = useState(false), statsOpen = _st[0], setStatsOpen = _st[1];
      var _cr = useState(false), confirmReset = _cr[0], setConfirmReset = _cr[1];
      var searchRef = useRef(null);
      var svgRef = useRef(null);
      var viewRef = useRef(view);
      viewRef.current = view;
      var dragRef = useRef({ on: false, moved: false, sx: 0, sy: 0, vx: 0, vy: 0 });
      var suppressRef = useRef(false);
      var lastMoveRef = useRef(0);
      var rootRef = useRef(null);
      var hoverTs = useRef(0);

      function toggleFull() {
        var el = rootRef.current;
        if (!full) {
          setFull(true);
          if (el && el.requestFullscreen) {
            try { el.requestFullscreen().catch(function () {}); } catch (err) {}
          }
        } else {
          setFull(false);
          if (document.fullscreenElement && document.exitFullscreen) {
            try { document.exitFullscreen().catch(function () {}); } catch (err) {}
          }
        }
      }
      useEffect(function () {
        function onFs() { setFull(!!document.fullscreenElement); }
        document.addEventListener('fullscreenchange', onFs);
        return function () { document.removeEventListener('fullscreenchange', onFs); };
      }, []);

      function clampView(v) {
        var minW = MW / 22, maxW = MW * 7;
        var w = Math.min(maxW, Math.max(minW, v.w));
        if (w !== v.w) {
          var cx = v.x + v.w / 2, cy = v.y + v.h / 2;
          v = { x: cx - w / 2, y: cy - (w * MH / MW) / 2, w: w, h: w * MH / MW };
        }
        var h = v.h;
        var minX = Math.min(0, MW - w) - w * 0.15, maxX = Math.max(0, MW - w) + w * 0.15;
        var minY = Math.min(0, MH - h) - h * 0.15, maxY = Math.max(0, MH - h) + h * 0.15;
        return {
          x: Math.min(maxX, Math.max(minX, v.x)),
          y: Math.min(maxY, Math.max(minY, v.y)),
          w: w, h: h
        };
      }
      function toSvgPoint(clientX, clientY) {
        var el = svgRef.current;
        if (!el) return null;
        var m = el.getScreenCTM();
        if (!m) return null;
        var pt = el.createSVGPoint();
        pt.x = clientX; pt.y = clientY;
        return pt.matrixTransform(m.inverse());
      }
      function zoomBy(factor, clientX, clientY) {
        setView(function (v) {
          var p = (clientX == null || clientY == null)
            ? { x: v.x + v.w / 2, y: v.y + v.h / 2 }
            : (toSvgPoint(clientX, clientY) || { x: v.x + v.w / 2, y: v.y + v.h / 2 });
          return clampView({
            x: p.x - (p.x - v.x) * factor,
            y: p.y - (p.y - v.y) * factor,
            w: v.w * factor,
            h: v.h * factor
          });
        });
      }
      useEffect(function () {
        var el = svgRef.current;
        if (!el) return;
        function onWheel(e) {
          e.preventDefault();
          zoomBy(e.deltaY > 0 ? 1.14 : 0.88, e.clientX, e.clientY);
        }
        el.addEventListener('wheel', onWheel, { passive: false });
        return function () { el.removeEventListener('wheel', onWheel); };
      }, []);
      useEffect(function () {
        if (!full) return;
        function onKey(e) { if (e.key === 'Escape') setFull(false); }
        window.addEventListener('keydown', onKey);
        return function () { window.removeEventListener('keydown', onKey); };
      }, [full]);
      function onPointerDown(e) {
        if (e.button !== 0) return;
        setHover(null);
        dragRef.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
      }
      function onPointerMove(e) {
        var d = dragRef.current;
        if (!d.on) return;
        var dx = e.clientX - d.sx, dy = e.clientY - d.sy;
        if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        d.moved = true;
        var m = svgRef.current && svgRef.current.getScreenCTM();
        var scale = m && m.a ? m.a : 1;
        var now = Date.now();
        if (now - lastMoveRef.current < 16) return;
        lastMoveRef.current = now;
        var vw = viewRef.current;
        setView(clampView({ x: d.vx - dx / scale, y: d.vy - dy / scale, w: vw.w, h: vw.h }));
      }
      function onPointerUp() {
        var d = dragRef.current;
        if (d.moved) {
          suppressRef.current = true;
          setTimeout(function () { suppressRef.current = false; }, 0);
        }
        d.on = false;
      }
      useEffect(function () {
        function move(e) { if (dragRef.current.on) onPointerMove(e); }
        function up() { if (dragRef.current.on) onPointerUp(); }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        return function () {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
        };
      }, []);

      var selEv = sel ? BY_ID[sel] : null;
      var hlProv = selEv && selEv.kind === 'geo' ? normName(selEv.p) : null;

      var stats = useMemo(function () {
        var ids = Object.keys(answers);
        var ok = ids.filter(function (k) { return answers[k] === true; }).length;
        return { done: ids.length, ok: ok };
      }, [answers]);

      var periodCounts = useMemo(function () {
        var m = {};
        EVENTS.forEach(function (e) { m[e.period] = (m[e.period] || 0) + 1; });
        return m;
      }, []);

      function startQuiz(evId) {
        var qs = Q_BY_EV[evId] || [];
        if (!qs.length) return;
        setQuiz({ ids: qs.map(function (q) { return q.id; }), ev: evId, i: 0, picked: null, correct: 0, done: false });
      }
      var QMAP = useMemo(function () {
        var m = {};
        QUIZ.forEach(function (q) { m[q.id] = q; });
        return m;
      }, []);
      var curQ = quiz && !quiz.done ? QMAP[quiz.ids[quiz.i]] : null;

      function pick(idx) {
        if (!curQ || quiz.picked !== null) return;
        var ok = idx === curQ.a;
        var next = Object.assign({}, answers);
        next[curQ.id] = ok;
        setAnswers(next); saveAnswers(next); bumpDaily();
        setQuiz(Object.assign({}, quiz, { picked: idx, correct: quiz.correct + (ok ? 1 : 0) }));
      }
      function nextQ() {
        var ni = quiz.i + 1;
        if (ni >= quiz.ids.length) setQuiz(Object.assign({}, quiz, { done: true }));
        else setQuiz(Object.assign({}, quiz, { i: ni, picked: null }));
      }

      var dots = useMemo(function () {
        var groups = {};
        GEO.forEach(function (e) {
          var k = e.lon.toFixed(2) + ',' + e.lat.toFixed(2);
          (groups[k] = groups[k] || []).push(e);
        });
        var out = [];
        Object.keys(groups).forEach(function (k) {
          var g = groups[k];
          g.forEach(function (e, i) {
            var ox = 0, oy = 0;
            if (g.length > 1) {
              var ang = i * (Math.PI * 2 / Math.min(g.length, 9)) + 0.4;
              var rad = 11 + Math.floor(i / 9) * 11;
              ox = Math.cos(ang) * rad;
              oy = Math.sin(ang) * rad;
            }
            out.push({ e: e, ox: ox, oy: oy });
          });
        });
        return out;
      }, []);
      var geoFiltered = dots.filter(function (d) { return filter === 'all' || d.e.period === filter; });

      var status = useMemo(function () {
        var m = {};
        Object.keys(Q_BY_EV).forEach(function (evId) {
          var qs = Q_BY_EV[evId];
          var answered = 0, bad = false, complete = true;
          qs.forEach(function (q) {
            var a = answers[q.id];
            if (a === undefined) { complete = false; return; }
            answered++;
            if (!a) bad = true;
          });
          m[evId] = answered === 0 ? 'new' : (bad ? 'bad' : (complete ? 'ok' : 'part'));
        });
        return m;
      }, [answers]);

      var eraPhase = useMemo(function () {
        if (!eraOn) return null;
        var list = ERA.phases;
        for (var i = 0; i < list.length; i++) {
          if (eraYear >= list[i].from && eraYear < list[i].to) return list[i];
        }
        return list[list.length - 1];
      }, [eraOn, eraYear]);

      var eraFill = useMemo(function () {
        var m = {};
        if (!eraPhase) return m;
        var all = MAP.main.provinces.map(function (p) { return p[0]; });
        eraPhase.factions.forEach(function (f) {
          if (f.prov === 'all') all.forEach(function (n) { m[n] = f.color; });
          else if (Array.isArray(f.prov)) f.prov.forEach(function (n) { m[n] = f.color; });
        });
        eraPhase.factions.forEach(function (f) {
          if (f.prov === 'rest') all.forEach(function (n) { if (!m[n]) m[n] = f.color; });
        });
        all.forEach(function (n) { if (!m[n]) m[n] = '#7f8fa6'; });
        return m;
      }, [eraPhase]);

      var activeRoutes = useMemo(function () {
        if (!eraOn) return [];
        return ERA.routes.filter(function (r) { return eraYear >= r.from && eraYear <= r.to; });
      }, [eraOn, eraYear]);

      var zoomed = MW / view.w >= 2.6;

      function pickEvent(id) {
        setSel(id);
        var e = BY_ID[id];
        if (!e || e.kind !== 'geo') return;
        var xy = proj(e.lon, e.lat);
        setView(function (v) {
          return clampView({ x: xy[0] - v.w / 2, y: xy[1] - v.h / 2, w: v.w, h: v.h });
        });
      }

      var ordered = useMemo(function () {
        return EVENTS.filter(function (e) { return filter === 'all' || e.period === filter; })
          .sort(function (a, b) { return a.y - b.y; });
      }, [filter]);

      var hits = useMemo(function () {
        var s = q.trim();
        if (!s) return [];
        var out = [];
        for (var i = 0; i < EVENTS.length && out.length < 8; i++) {
          var e = EVENTS[i];
          var hay = e.t + ' ' + (e.md || '') + ' ' + (e.p || '') + ' ' + ((e.pts || []).join(' ')) + ' ' + (e.d || '');
          if (hay.indexOf(s) >= 0) out.push(e);
        }
        return out;
      }, [q]);

      function stepEvent(dir) {
        if (!ordered.length) return;
        var idx = -1;
        for (var i = 0; i < ordered.length; i++) { if (ordered[i].id === sel) { idx = i; break; } }
        var n = idx < 0 ? (dir > 0 ? 0 : ordered.length - 1) : idx + dir;
        if (n < 0) n = 0;
        if (n >= ordered.length) n = ordered.length - 1;
        pickEvent(ordered[n].id);
      }

      function doReset() {
        var empty = {};
        setAnswers(empty);
        saveAnswers(empty);
        try { localStorage.removeItem(DAILY_KEY); } catch (err) {}
        setConfirmReset(false);
        setStatsOpen(false);
        setDrillOpen(false);
      }

      useEffect(function () {
        function onKey(e) {
          if (drillOpen || quiz || statsOpen) return;
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
          if (e.key === 'ArrowLeft') { e.preventDefault(); stepEvent(-1); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); stepEvent(1); }
          else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(0.85); }
          else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1.18); }
          else if (e.key === ' ') { e.preventDefault(); setEraOn(!eraOn); }
          else if (e.key === '/') {
            e.preventDefault();
            if (searchRef.current) searchRef.current.focus();
          }
        }
        window.addEventListener('keydown', onKey);
        return function () { window.removeEventListener('keydown', onKey); };
      }, [ordered, sel, drillOpen, quiz, statsOpen, eraOn]);

      var stepRow = h('div', { className: 'cn-step' },
        h('button', {
          className: 'cn-stepbtn', title: '上一个考点（←）',
          onClick: function () { stepEvent(-1); }
        }, '\u25c0'),
        h('span', { className: 'cn-stepname' }, selEv ? selEv.t : '\u9009\u4e00\u4e2a\u8003\u70b9'),
        h('button', {
          className: 'cn-stepbtn', title: '下一个考点（→）',
          onClick: function () { stepEvent(1); }
        }, '\u25b6')
      );

      var STATUS_STROKE = {
        new: 'rgba(255,255,255,0.8)',
        ok: 'var(--dsw-alias-state-success-primary)',
        bad: 'var(--dsw-alias-state-error-primary)',
        part: 'var(--dsw-alias-state-warn-primary)'
      };
      var STATUS_TEXT = { new: '', ok: ' \u00b7 \u5df2\u638c\u63e1', bad: ' \u00b7 \u6709\u9519\u9898', part: ' \u00b7 \u505a\u4e86\u4e00\u90e8\u5206' };

      return h('div', { className: 'cn-root' + (full ? ' cn-full' : ''), ref: rootRef },
        h('style', null, CSS),
        full ? null : h('div', { className: 'cn-head' },
          h('div', null,
            h('div', { className: 'cn-title' }, '\u4e2d\u5171\u515a\u53f2\u00b7\u5730\u56fe\u5237\u9898'),
            h('div', { className: 'cn-sub' }, '\u70b9\u5730\u56fe\u4e0a\u7684\u70b9\u6216\u4e0b\u65b9\u65f6\u95f4\u7ebf\uff0c\u5c55\u5f00\u4e00\u7ec4\u9009\u62e9\u9898')
          ),
          h('button', {
            className: 'cn-btn ghost',
            style: { width: 'auto', marginTop: 0, marginLeft: 'auto', padding: '6px 12px', flex: 'none' },
            onClick: function () { toggleFull(); }
          }, '\u5168\u5c4f'),
          h('button', {
            className: 'cn-btn' + (eraOn ? '' : ' ghost'),
            style: { width: 'auto', marginTop: 0, marginLeft: 8, padding: '6px 14px', flex: 'none' },
            onClick: function () { setEraOn(!eraOn); }
          }, eraOn ? '年代图层 · 开' : '年代图层'),
          h('button', {
            className: 'cn-btn',
            style: { width: 'auto', marginTop: 0, marginLeft: 8, padding: '6px 16px', flex: 'none' },
            onClick: function () { setDrillOpen(true); }
          }, '\u6574\u5408\u5237\u9898'),
          h('button', {
            className: 'cn-btn ghost',
            style: { width: 'auto', marginTop: 0, marginLeft: 8, padding: '6px 12px', flex: 'none' },
            onClick: function () { setStatsOpen(true); }
          }, '\u7edf\u8ba1'),
          h('div', { className: 'cn-stats', style: { marginLeft: 16 } },
            h(Stat, { value: EVENTS.length, label: '\u8003\u70b9' }),
            h(Stat, { value: QUIZ.length, label: '\u9898\u76ee' }),
            h(Stat, { value: stats.ok + '/' + QUIZ.length, label: '\u5df2\u7b54\u5bf9', color: 'var(--dsw-alias-state-success-primary)' })
          )
        ),
        full ? null : h('div', { className: 'cn-filter' },
          h('button', {
            className: 'cn-chip' + (filter === 'all' ? ' on' : ''),
            onClick: function () { setFilter('all'); }
          }, '\u5168\u90e8 ' + EVENTS.length),
          ORDER.map(function (k) {
            return h('button', {
              key: k,
              className: 'cn-chip' + (filter === k ? ' on' : ''),
              onClick: function () { setFilter(filter === k ? 'all' : k); }
            }, h('i', { style: { background: COLOR[k] } }), PERIODS[k].t + ' ' + (periodCounts[k] || 0));
          }),
          h('div', { className: 'cn-search', style: { marginLeft: 'auto' } },
            h('input', {
              ref: searchRef,
              placeholder: '\u641c\u8003\u70b9\uff08/\uff09',
              value: q,
              onChange: function (ev) { setQ(ev.target.value); },
              onKeyDown: function (ev) {
                if (ev.key === 'Enter' && hits.length) {
                  pickEvent(hits[0].id);
                  setQ('');
                } else if (ev.key === 'Escape') {
                  setQ('');
                  ev.currentTarget.blur();
                }
              }
            }),
            q && hits.length ? h('div', { className: 'cn-search-list' },
              hits.map(function (e) {
                return h('button', {
                  key: e.id, className: 'cn-search-item',
                  onClick: function () { pickEvent(e.id); setQ(''); }
                },
                  h('span', { className: 'cn-si-t' }, e.t),
                  h('span', { className: 'cn-si-y' }, String(e.y))
                );
              })
            ) : null,
            q && !hits.length ? h('div', { className: 'cn-search-list cn-search-empty' }, '\u6ca1\u627e\u5230') : null
          )
        ),
        full ? null : h(Timeline, { selected: sel, onPick: pickEvent, filter: filter, eraOn: eraOn, eraYear: eraYear, onYearChange: setEraYear, range: tlRange, onRange: setTlRange }),
        full ? null : stepRow,
        eraOn && !full ? h('div', { className: 'cn-era' },
          h('input', {
            type: 'range', min: 1840, max: 2026, step: 1, value: eraYear,
            onChange: function (ev) { setEraYear(Number(ev.target.value)); }
          }),
          h('span', { className: 'cn-era-year' }, String(eraYear)),
          h('span', { className: 'cn-era-label' }, eraPhase ? eraPhase.label : '')
        ) : null,
        h('div', { className: 'cn-body' },
          full ? h('button', {
            className: 'cn-exit',
            onClick: function () { toggleFull(); }
          }, '\u9000\u51fa\u5168\u5c4f') : null,
          full ? h('button', {
            className: 'cn-exit cn-modebtn',
            onClick: function () { setEraOn(!eraOn); }
          }, eraOn ? '\u5e74\u4ee3\u56fe\u5c42 \u00b7 \u5f00' : '\u5e74\u4ee3\u56fe\u5c42') : null,
          full && eraOn ? h('div', { className: 'cn-era cn-era-float' },
            h('input', {
              type: 'range', min: 1840, max: 2026, step: 1, value: eraYear,
              onChange: function (ev) { setEraYear(Number(ev.target.value)); }
            }),
            h('span', { className: 'cn-era-year' }, String(eraYear)),
            h('span', { className: 'cn-era-label' }, eraPhase ? eraPhase.label : '')
          ) : null,
          full ? h('div', { className: 'cn-tl-float' },
            h(Timeline, { selected: sel, onPick: pickEvent, filter: filter, eraOn: eraOn, eraYear: eraYear, onYearChange: setEraYear, range: tlRange, onRange: setTlRange }),
            stepRow
          ) : null,
          h('svg', {
            className: 'cn-map',
            ref: svgRef,
            viewBox: view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h,
            preserveAspectRatio: 'xMidYMid meet',
            onPointerDown: onPointerDown,
            onClickCapture: function (ev) {
              if (suppressRef.current) {
                suppressRef.current = false;
                ev.stopPropagation();
                ev.preventDefault();
              }
            },
            onClick: function (ev) { if (ev.target.tagName === 'svg') setSel(null); },
            onDoubleClick: function (ev) { ev.preventDefault(); zoomBy(0.55, ev.clientX, ev.clientY); }
          },
            MAP.main.countries.map(function (p) {
              var mongolia = eraOn && eraYear < 1946 && p[0] === '\u8499\u53e4\u56fd';
              var col = mongolia
                ? (eraYear < 1912 ? '#a98455b8' : '#4f8fd9b8')
                : 'color-mix(in srgb, var(--dsw-alias-label-secondary) 9%, transparent)';
              return h('g', { key: 'c-' + p[0] },
                h('path', {
                  d: p[1], fill: col, stroke: col, strokeWidth: 2, strokeLinejoin: 'round',
                  style: { pointerEvents: 'none' }
                }),
                h('path', {
                  d: p[1], fill: col, stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 0.55,
                  vectorEffect: 'non-scaling-stroke',
                  style: { pointerEvents: 'none' }
                })
              );
            }),
            MAP.main.provinces.map(function (p) {
              var name = normName(p[0]);
              var on = !eraOn && hlProv === name;
              return h('path', {
                key: p[0], d: p[1], className: 'cn-prov',
                fill: eraOn
                  ? ((eraFill[p[0]] || '#7f8fa6') + 'b4')
                  : (on ? COLOR[selEv.period] + '66' : 'color-mix(in srgb, var(--dsw-alias-label-secondary) 18%, transparent)'),
                stroke: eraOn ? 'rgba(255,255,255,0.16)' : (on ? COLOR[selEv.period] : 'var(--dsw-alias-border-l2)'),
                strokeWidth: on ? 1.6 : 0.7,
                vectorEffect: 'non-scaling-stroke',
                style: { cursor: 'pointer' },
                onClick: (function (nm) {
                  return function () {
                    var hit = EVENTS.filter(function (e) { return e.kind === 'geo' && normName(e.p) === nm; })
                      .sort(function (a, b) { return a.y - b.y; })[0];
                    if (hit) setSel(hit.id);
                  };
                })(name)
              }, h('title', null, p[0]));
            }),
            geoFiltered.map(function (d) {
              var e = d.e;
              var xy = proj(e.lon, e.lat);
              var isSel = sel === e.id;
              var z = MW / view.w;
              var st = status[e.id] || 'new';
              var cx = xy[0] + d.ox / z;
              var cy = xy[1] + d.oy / z;
              return h('g', { key: e.id, style: { opacity: eraOn ? 0.22 : 1 } },
                isSel ? h('circle', {
                  cx: cx, cy: cy, r: 10 / z, fill: 'none',
                  stroke: st === 'new' ? '#fff' : STATUS_STROKE[st],
                  strokeWidth: 1.3 / z, opacity: 0.5,
                  style: { pointerEvents: 'none' }
                }) : null,
                h('circle', {
                  className: 'cn-dot',
                  cx: cx, cy: cy, r: (isSel ? 5.2 : 4) / z,
                  fill: COLOR[e.period],
                  stroke: isSel ? '#fff' : STATUS_STROKE[st],
                  strokeWidth: (isSel ? 2 : 1.7) / z,
                  style: { cursor: 'pointer' },
                  onMouseEnter: function (ev2) {
                    if (dragRef.current.on || eraOn) return;
                    var now = Date.now();
                    if (now - hoverTs.current < 40) return;
                    hoverTs.current = now;
                    setHover({ id: e.id, x: ev2.clientX, y: ev2.clientY });
                  },
                  onMouseLeave: function () { setHover(null); },
                  onClick: function (ev2) { ev2.stopPropagation(); setSel(e.id); }
                }),
                zoomed && !eraOn ? h('text', {
                  x: cx + 7 / z, y: cy + 3.6 / z, fontSize: 10 / z,
                  fill: 'var(--dsw-alias-label-primary)',
                  style: { pointerEvents: 'none', paintOrder: 'stroke', stroke: 'var(--dsw-alias-bg-base)', strokeWidth: 2.5 / z }
                }, e.t) : null
              );
            }),
            activeRoutes.map(function (r, ri) {
              var z = MW / view.w;
              var pts = r.points.map(function (p) { return proj(p[0], p[1]); });
              var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
              var end = pts[pts.length - 1];
              var prev = pts[pts.length - 2] || end;
              var ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180 / Math.PI;
              var s = 8 / z;
              return h('g', { key: 'rt' + ri, style: { pointerEvents: 'none' } },
                h('path', {
                  d: d, fill: 'none', stroke: r.color, strokeWidth: 2.2 / z,
                  strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.9
                }),
                h('path', {
                  d: 'M0,0 L' + (-s) + ',' + (-s * 0.52) + ' L' + (-s) + ',' + (s * 0.52) + ' Z',
                  transform: 'translate(' + end[0].toFixed(1) + ',' + end[1].toFixed(1) + ') rotate(' + ang.toFixed(1) + ')',
                  fill: r.color, opacity: 0.95
                }),
                h('title', null, r.name + ' \u00b7 ' + r.from + '\u2014' + r.to)
              );
            }),
            MAP.main.jd.map(function (d, i) {
              return h('path', {
                key: 'jd' + i, d: d, fill: 'none',
                stroke: '#b0463b', strokeWidth: 1.4, opacity: 0.72,
                strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke',
                style: { pointerEvents: 'none' }
              });
            }),
            MAP.main.islands.map(function (p, i) {
              var xy = proj(p[0], p[1]);
              return h('circle', { key: 'isl' + i, cx: xy[0], cy: xy[1], r: 2.4, fill: '#b0463b', opacity: 0.9, style: { pointerEvents: 'none' } });
            })
          ),
          h('div', { className: 'cn-zoom' },
            h('button', { key: 'in', title: '\u653e\u5927', onClick: function () { zoomBy(0.8); } }, '+'),
            h('button', { key: 'out', title: '\u7f29\u5c0f', onClick: function () { zoomBy(1.25); } }, '\u2212'),
            h('div', { key: 'lv', className: 'cn-zoomlv' }, (MW / view.w).toFixed(1) + '\u00d7'),
            h('button', { key: 'reset', title: '\u590d\u4f4d', onClick: function () { setView({ x: 0, y: 0, w: MW, h: MH }); } }, '\u27f2')
          ),
          eraOn && eraPhase
            ? h('div', { className: 'cn-legend' },
                eraPhase.factions.map(function (f) {
                  return h('span', { key: f.name, className: 'cn-lg' }, h('i', { style: { background: f.color } }), f.name);
                })
              )
            : h('div', { className: 'cn-legend' },
                ORDER.filter(function (k) { return k !== 'doc' && (periodCounts[k] || 0) > 0; }).map(function (k) {
                  return h('span', { key: k, className: 'cn-lg' }, h('i', { style: { background: COLOR[k] } }), PERIODS[k].s);
                })
              ),
          hover && BY_ID[hover.id] ? h('div', {
            className: 'cn-tip',
            style: { left: hover.x + 14, top: hover.y + 16 }
          },
            h('div', { className: 'cn-tip-t' }, BY_ID[hover.id].t),
            h('div', { className: 'cn-tip-s' },
              BY_ID[hover.id].y + ' \u00b7 ' + ((Q_BY_EV[hover.id] || []).length) + ' \u9898' + (STATUS_TEXT[status[hover.id] || 'new'] || ''))
          ) : null,
          selEv ? h('div', { className: 'cn-card' + (cardOpen ? '' : ' cn-card-min') },
            h('div', { className: 'cn-cardbar' },
              h('div', { className: 'cn-meta' },
                h('span', { style: { color: COLOR[selEv.period], fontWeight: 600 } }, PERIODS[selEv.period].t),
                ' \u00b7 ',
                selEv.md,
                selEv.p ? ' \u00b7 ' + selEv.p : ''
              ),
              h('button', {
                className: 'cn-mini',
                onClick: function () { setCardOpen(!cardOpen); }
              }, cardOpen ? '\u6536\u8d77' : '\u5c55\u5f00')
            ),
            h('h3', null, selEv.t),
            cardOpen ? h('div', null,
              h('div', { className: 'cn-desc' }, selEv.d),
              h('div', null, (selEv.pts || []).map(function (p, i) {
                return h('span', { key: i, className: 'cn-tag' }, p);
              })),
              h('div', { className: 'cn-meta', style: { marginTop: 6 } }, '\u51fa\u5904\uff1a' + selEv.src),
              (function () {
                var qs = Q_BY_EV[selEv.id] || [];
                if (!qs.length) return null;
                var okN = 0;
                qs.forEach(function (qq) { if (answers[qq.id] === true) okN++; });
                return h('div', { className: 'cn-meta' }, '\u8fd9\u7ec4\u9898\u5df2\u7b54\u5bf9 ' + okN + ' / ' + qs.length);
              })(),
              (Q_BY_EV[selEv.id] || []).length
                ? h('button', { className: 'cn-btn', onClick: function () { startQuiz(selEv.id); } },
                    '\u5237\u8fd9\u7ec4\u9898\uff08' + Q_BY_EV[selEv.id].length + '\uff09')
                : null,
              h('button', {
                className: 'cn-btn ghost', style: { marginTop: 6 },
                onClick: function () { setSel(null); }
              }, '\u5173\u95ed')
            ) : null
          ) : h('div', { className: 'cn-hint' }, '\u70b9\u4e2d\u4e00\u4e2a\u70b9\u770b\u8003\u70b9'),

          quiz ? h('div', { className: 'cn-quiz' },
            h('div', { className: 'cn-qhead' },
              h('b', null, quiz.done ? '\u5b8c\u6210' : '\u7b2c ' + (quiz.i + 1) + ' / ' + quiz.ids.length + ' \u9898'),
              h('span', { style: { marginLeft: 'auto' } }, (BY_ID[quiz.ev] || {}).t || ''),
              h('button', { className: 'cn-chip', onClick: function () { setQuiz(null); } }, '\u9000\u51fa')
            ),
            quiz.done
              ? h('div', null,
                  h('div', { className: 'cn-score' }, quiz.correct + ' / ' + quiz.ids.length),
                  h('div', { className: 'cn-meta' }, '\u672c\u7ec4\u6b63\u786e\u7387 ' + Math.round(quiz.correct / quiz.ids.length * 100) + '%'),
                  h('div', { className: 'cn-foot' },
                    h('button', { className: 'cn-btn', onClick: function () { startQuiz(quiz.ev); } }, '\u91cd\u505a\u4e00\u904d'),
                    h('button', { className: 'cn-btn ghost', onClick: function () { setQuiz(null); } }, '\u56de\u5230\u5730\u56fe')
                  )
                )
              : h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
                  h('div', { className: 'cn-q' }, curQ.q),
                  h('div', { className: 'cn-opts' },
                    curQ.o.map(function (opt, i) {
                      var cls = 'cn-opt';
                      if (quiz.picked !== null) {
                        if (i === curQ.a) cls += ' ok';
                        else if (i === quiz.picked) cls += ' no';
                      }
                      return h('button', { key: i, className: cls, onClick: function () { pick(i); } },
                        String.fromCharCode(65 + i) + '\u3001' + opt);
                    })
                  ),
                  quiz.picked !== null ? h('div', { className: 'cn-why' }, '\u7b54\u6848\uff1a' + String.fromCharCode(65 + curQ.a) + '\u3002' + curQ.why) : null,
                  h('div', { className: 'cn-foot' },
                    h('button', {
                      className: 'cn-btn', disabled: quiz.picked === null, onClick: nextQ
                    }, quiz.i + 1 >= quiz.ids.length ? '\u770b\u6210\u7ee9' : '\u4e0b\u4e00\u9898')
                  )
                )
          ) : null,
          statsOpen ? h(Stats, {
            answers: answers,
            onClose: function () { setStatsOpen(false); },
            onClear: function () { setConfirmReset(true); }
          }) : null,
          drillOpen ? h(Drill, {
            answers: answers,
            onAnswer: function (id, ok) {
              var n = Object.assign({}, answers);
              n[id] = ok;
              setAnswers(n);
              saveAnswers(n);
              bumpDaily();
            },
            onClose: function () { setDrillOpen(false); },
            onReset: function () { setConfirmReset(true); }
          }) : null
        ),
        confirmReset ? h('div', { className: 'cn-mask' },
          h('div', { className: 'cn-dialog' },
            h('div', { className: 'cn-dialog-t' }, '是否重置？'),
            h('div', { className: 'cn-dialog-s' }, '会清空所有答题记录、错题本和最近七天的统计，不可恢复。'),
            h('div', { className: 'cn-dialog-b' },
              h('button', { className: 'cn-btn ghost', onClick: function () { setConfirmReset(false); } }, '取消'),
              h('button', { className: 'cn-btn', onClick: doReset }, '确定重置')
            )
          )
        ) : null
      );
    }

    return {
      name: 'china-timeline',
      inject: ['slots'],
      apply: function (ctx) {
        ctx.slots.inject('sidebar.panellist', function () {
          return ctx.slots.register({
            name: 'sidebar.panellist',
            id: 'china-timeline',
            order: 90,
            label: function () { return '\u4e2d\u5171\u515a\u53f2\u4e13\u4e1a\u5237\u9898'; }
          }, Icon);
        });
        ctx.slots.inject('main', function () {
          return ctx.slots.register({ name: 'main', key: 'china-timeline' }, App);
        });
      }
    };
  }
});
