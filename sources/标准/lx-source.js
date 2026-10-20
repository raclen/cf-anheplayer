/*!
 * @name 豆包定制[聚合音源]
 * @description v11.11接口满编版：溯音酷我128k恢复(10-15实测Range 206可播)，kw 128k五路兜底(溯音酷我/星海后端/酷我官方/长青/念心)满编；探测歌曲池轮换(晴天/海阔天空/稻香)防单曲被风控误判；v11.10双音质分域探测/音质校验/音质优先保持
 * @version 11.11 接口满编版
 * @author 豆包定制
 * @contribution 实测(2026-10-15)：溯音酷我flac✅206、128k✅恢复(10-07时410死链→10-15新签名可播)；溯音163(免费歌)✅；GDAPI(320)✅m801直链；星海后端(带X-Token)✅kw-bj；酷我官方✅206；网易云outer✅302；长青kw/念心kw✅302→car-er 206；仍失效:溯音QQ(-403)/溯音咪咕(502)/星海备(000)/星海zrcdy(410废弃)；上游全部无更新(pdone指纹一致/洛雪v2.12.6/星海51372B一致)
 */
// ============================================================
// 第一部分：常量配置
// ============================================================
const CACHE_TTL_MS = 21600000;          // 6小时 成功缓存
const FAIL_CACHE_TTL_MS = 300000;       // 5分钟 失败缓存
const CACHE_MAX_SIZE = 500;
const FAIL_CACHE_MAX_SIZE = 300;
const HTTP_URL_REGEX = /^https?:\/\//i;
const BREAKER_THRESHOLD = 3;            // 连续失败熔断阈值
const BREAKER_COOLDOWN_MS = 180000;     // 熔断冷却 3分钟
const RETRY_TIMES = 1;                  // 网络错误重试次数(v11.8:2→1，避免重试放大)
const RACE_OVERALL_TIMEOUT_MS = 6000;   // fallbackRace 整体超时(v11.8新增)

const ERROR_CODES = {
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PARAM_ERROR: 'PARAM_ERROR',
  COPYRIGHT_LIMIT: 'COPYRIGHT_LIMIT',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  MISMATCH: 'SONG_MISMATCH',
  CONFIG_ERROR: 'CONFIG_ERROR'
};

const TIMEOUT_CONFIG = { search: 3000, parse: 5000, default: 5000 }; // v11.8: parse 8000→5000

// API 端点
// GD Studio（实测：仅网易云 netease，br=999→真实flac/br=320→320k/br=128→128k；免费公共服务，5分钟50次限制，仅用于wy高音质链，不进128k兜底竞速）
const GD_API = "https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light";
const XINGHAI_BACKUP_API = "https://music-dl.sayqz.com/api/"; // 实测：域名不可解析，已失效（保留常量便于恢复）
// 溯音系（实测：仅 Kuwo 可用；QQ -403维护中；163 免费歌恢复可用；咪咕 502 IP限制）
const SUYIN_QQ_API = "https://oiapi.net/api/QQ_Music";
const SUYIN_QQ_KEY = "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575";
const SUYIN_163_API = "https://oiapi.net/api/Music_163";
const SUYIN_KUWO_API = "https://oiapi.net/api/Kuwo";
const SUYIN_MIGU_API = "https://api.xcvts.cn/api/music/migu";
// Huibq：实测仅酷我真实可用，其他平台假兜底，默认关闭
const HUIBQ_API = "https://lxmusicapi.onrender.com";
const HUIBQ_REQUEST_KEY = "share-v3";
// 聆川（未配置，默认关闭）
const LINGCHUAN_API = "https://api.lingchuan.com/v1";
// 星海后端主域聚合（v11.8重新接入：仅 kw、仅128k；实测 code==200→真实酷我mp3；wy 签名URL本机403疑绑定后端出口IP，未接入wy）
const XINGHAI_BACKEND_API = "https://yy.zddyr.top/lx/api/";
// 网易云官方 outer 直连（免费歌302→真实mp3；VIP/无版权歌404自动跳过；固定128k）
const WY_OUTER_API = "https://music.163.com/song/media/outer/url?id={id}.mp3";
// 酷我官方直连（自研：搜索r.s→rid→convert_url，固定128k真实mp3，无第三方）
const KUWO_SEARCH_API = "http://search.kuwo.cn/r.s";
const KUWO_CONVERT_API = "http://antiserver.kuwo.cn/anti.s";
// ikun 服务器源（需卡密；填入 IKUN_API_KEY 并开启 ikun 开关后生效）
const IKUN_API = "https://api.ikunshare.com";
const IKUN_API_KEY = ""; // 填入你的 ikun 卡密后开启使用

// 长青SVIP（实测：IP白名单/无链接/需付费level，已失效，默认关闭）
const CHANGQING_URL_TEMPLATES = {
  tx: "http://175.27.166.236/kgqq/qq.php?type=mp3&id={id}&level={level}",
  wy: "http://175.27.166.236/wy/wy.php?type=mp3&id={id}&level={level}",
  kw: "https://musicapi.haitangw.net/music/kw.php?type=mp3&id={id}&level={level}",
  kg: "https://music.haitangw.cc/kgqq/kg.php?type=mp3&id={id}&level={level}",
  mg: "https://music.haitangw.cc/musicapi/mg.php?type=mp3&id={id}&level={level}"
};
// 念心SVIP（实测：全部404/空跳转，已失效，默认关闭）
const NIANXIN_URL_TEMPLATES = {
  tx: "https://music.nxinxz.com/kgqq/tx.php?id={id}&level={level}&type=mp3",
  wy: "http://music.nxinxz.com/wy.php?id={id}&level={level}&type=mp3",
  kw: "http://music.nxinxz.com/kw.php?id={id}&level={level}&type=mp3",
  kg: "https://music.nxinxz.com/kgqq/kg.php?id={id}&level={level}&type=mp3",
  mg: "http://music.nxinxz.com/mg.php?id={id}&level={level}&type=mp3"
};

// ============================================================
// 第二部分：音源开关（按实测结果配置，可自行调整）
// ============================================================
const SOURCE_TOGGLES = {
  // ---- 默认开启（实测可用） ----
  suyinKuwo: true,      // 溯音酷我：全平台兜底(第三方，支持flac/320k/128k)
  wyOuter: true,        // 网易云官方outer直连：固定128k免费歌直链(实测可用)
  kuwoOfficial: true,   // 酷我官方直连：固定128k真实mp3(实测可用，无第三方)
  suyin163: true,       // 溯音163：免费歌真实128k直链，VIP歌url:null自动跳过
  gdWy: true,           // GD Studio：wy flac/320k高音质优先源(限5min50次，仅高音质链用)
  xinghaiBackend: true, // 星海后端主域：kw 128k 第三重兜底(与溯音酷我/酷我官方并列)
  // ---- 默认关闭（接口失效/需配置，可自行开启） ----
  xinghaiBackup: false, // 星海备：域名不可解析
  suyinQQ: false,       // 溯音QQ：实测-403维护中
  suyinMigu: false,     // 溯音咪咕：实测502(上游IP被咪咕封)
  changqingVip: true,  // 长青：v11.9实测仅kw恢复(302→car-er.kuwo.cn新鲜mp3)，仅kw 128k兜底
  nianxinVip: true,    // 念心：v11.9实测仅kw恢复(302→car-er.kuwo.cn新鲜mp3)，仅kw 128k兜底
  huibq: false,         // Huibq：实测仅酷我真实，其他平台假兜底
  lingchuan: false,     // 聆川：需配置
  ikun: false           // ikun服务器源：需卡密(IKUN_API_KEY)，填入后开启
};

// ============================================================
// 第二部分B：健康探测模块（v11.8：探测清单收敛为当前可用源 + 并发探测 + 统一跟随302）
// ============================================================
// 运行时开关：随探测结果自动变化；buildSourceChain 以它为准
const runtimeToggles = { ...SOURCE_TOGGLES };

const HEALTH_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 每10分钟一轮
const HEALTH_CHECK_INITIAL_DELAY_MS = 60 * 1000; // 加载后1分钟开始第一轮
const HEALTH_CHECK_TIMEOUT = 6000;                // 单次探测超时(v11.8:4000→6000，减少误摘)
const PROBE_PASS_REQUIRED = 2;                    // 连续通过2次才判定可用（防抖动）
const PROBE_FAIL_REQUIRED = 2;                    // 连续失败2次才判定失效（防抖动）
// v11.11：探测歌曲池轮换（晴天/海阔天空/稻香），避免单曲被风控导致探测误判
const PROBE_SONG_POOL = ["晴天", "海阔天空", "稻香"];

// 各源探测请求定义：仅保留当前可用源，失效源不再每轮空打
function buildProbeConfig() {
  const probeSong = PROBE_SONG_POOL[(globalThis.__probeRound || 0) % PROBE_SONG_POOL.length];
  return {
    gdWy: {
      url: `${GD_API}&types=url&source=netease&id=186016&br=320`,
      check: b => !!b && typeof b === "object" && typeof b.url === "string" && b.url.length > 0
    },
    xinghaiBackend: {
      url: `${XINGHAI_BACKEND_API}?source=kw&name=${encodeURIComponent("晴天")}&singer=${encodeURIComponent("周杰伦")}&songmid=1&interval=&albumName=&quality=128k`,
      headers: { "X-Token": xinghaiBackendToken(), "X-Client": "lx-aggregate/11.7" },
      check: b => !!b && typeof b === "object" && Number(b.code) === 200 && typeof b.url === "string" && b.url.length > 0
    },
    suyin163: {
      url: `${SUYIN_163_API}?id=2652820720`, // 探测用免费歌（code:0 + data[0].url 真实mp3）
      check: b => !!b && typeof b === "object" && Array.isArray(b.data) && typeof (b.data[0] || {}).url === "string" && b.data[0].url.length > 0
    },
    suyinKuwo: {
      // v11.10 P0：双音质分域探测(flac br=1 + 128k br=7)，任一可播即算源存活；
      // 修复"128k仍410死链但flac已恢复新签名"时单路探测误判整体失效、误摘高音质源
      // v11.11：探测歌曲走 PROBE_SONG_POOL 轮换，防单曲被风控误判
      probes: [
        {
          url: `${SUYIN_KUWO_API}?msg=${encodeURIComponent(probeSong)}&n=1&br=1`,
          check: b => !!b && typeof b === "object" && (!!(b.data && b.data.url) || /音乐链接/.test(String(b.message || ""))),
          extractUrl: b => ((b && b.data && b.data.url) ? b.data.url : (String((b && b.message) || "").match(/音乐链接[：:](\S+)/) || [])[1]) || null
        },
        {
          url: `${SUYIN_KUWO_API}?msg=${encodeURIComponent(probeSong)}&n=1&br=7`,
          check: b => !!b && typeof b === "object" && (!!(b.data && b.data.url) || /音乐链接/.test(String(b.message || ""))),
          extractUrl: b => ((b && b.data && b.data.url) ? b.data.url : (String((b && b.message) || "").match(/音乐链接[：:](\S+)/) || [])[1]) || null
        }
      ]
    },
    wyOuter: {
      url: WY_OUTER_API.replace("{id}", "2652820720"),
      headers: { "User-Agent": getMobileUserAgent() },
      checkRes: res => res.statusCode === 200 && /audio|octet|mpeg/i.test(String(res.headers?.["content-type"] || ""))
    },
    kuwoOfficial: {
      url: `${KUWO_SEARCH_API}?client=kt&all=${encodeURIComponent("晴天 周杰伦")}&pn=0&rn=1&ft=music&rformat=json&encoding=utf8`,
      headers: { "User-Agent": getMobileUserAgent() },
      check: b => {
        const raw = typeof b === "string" ? b : String(b || "");
        return raw.includes("MP3RID") && raw.includes("abslist");
      }
    },
    // v11.9：长青kw/念心kw 302→car-er.kuwo.cn新鲜mp3，Range校验可播(用rid=228908 晴天周杰伦)
    changqingVip: {
      url: CHANGQING_URL_TEMPLATES.kw.replace("{id}", "228908").replace("{level}", "standard"),
      headers: { "User-Agent": getMobileUserAgent(), "Range": "bytes=0-1023" },
      checkRes: res => (res.statusCode === 200 || res.statusCode === 206) && /audio|octet|mpeg/i.test(String(res.headers?.["content-type"] || "")) && !/kw\.php/.test(String(res.url || ""))
    },
    nianxinVip: {
      url: NIANXIN_URL_TEMPLATES.kw.replace("{id}", "228908").replace("{level}", "standard"),
      headers: { "User-Agent": getMobileUserAgent(), "Range": "bytes=0-1023" },
      checkRes: res => (res.statusCode === 200 || res.statusCode === 206) && /audio|octet|mpeg/i.test(String(res.headers?.["content-type"] || "")) && !/nxinxz\.com/.test(String(res.url || ""))
    }
  };
}

const probeState = {
  passCount: {},
  failCount: {},
  running: false
};

async function probeSingleSource(id, cfg) {
  // v11.10 P0：支持多路探测(probes)，任一路"结构+可播"通过即算源存活；
  // 解决溯音酷我"flac已恢复但128k仍410"时，单路(仅128k)探测误判整体失效、误摘高音质源的问题
  const probes = cfg.probes || [{
    url: cfg.url,
    headers: cfg.headers,
    check: cfg.check,
    checkRes: cfg.checkRes,
    extractUrl: cfg.extractUrl
  }];
  try {
    const results = await Promise.all(probes.map(async p => {
      try {
        const res = await httpRequest(p.url || "", {
          method: "GET",
          headers: { "User-Agent": getMobileUserAgent(), ...(p.headers || {}) },
          timeout: HEALTH_CHECK_TIMEOUT,
          follow_max: 5   // v11.8 P0：统一跟随302，修复wyOuter(outer 302→mp3)被误判失败
        });
        let usable = p.checkRes ? p.checkRes(res) : (p.check ? p.check(res.body) : true);
        // v11.9 P0：结构/状态通过后，对解析出的音频URL做Range可播性二次校验，
        // 识破"网关200、结构完整、但CDN签名已过期410死链"的假存活(如溯音酷我)
        if (usable && typeof p.extractUrl === "function") {
          const audioUrl = p.extractUrl(res.body);
          usable = audioUrl ? await isAudioPlayable(audioUrl) : false;
        }
        return usable;
      } catch (e) {
        return false;
      }
    }));
    return { usable: results.some(Boolean), raw: null };
  } catch (e) {
    return { usable: false, raw: null };
  }
}

function applyProbeResult(id, usable) {
  if (usable) {
    probeState.failCount[id] = 0;
    probeState.passCount[id] = (probeState.passCount[id] || 0) + 1;
    if (probeState.passCount[id] >= PROBE_PASS_REQUIRED) {
      const wasOff = runtimeToggles[id] === false;
      if (wasOff) {
        runtimeToggles[id] = true;
        logInfo(`健康探测: [${id}] 连续${PROBE_PASS_REQUIRED}次探测通过，已自动启用`);
      }
      probeState.passCount[id] = 0; // 重置，避免反复打日志
    }
  } else {
    probeState.passCount[id] = 0;
    probeState.failCount[id] = (probeState.failCount[id] || 0) + 1;
    if (probeState.failCount[id] >= PROBE_FAIL_REQUIRED) {
      const wasOn = runtimeToggles[id] === true;
      if (wasOn) {
        runtimeToggles[id] = false;
        logWarn(`健康探测: [${id}] 连续${PROBE_FAIL_REQUIRED}次探测失败，已自动关闭(恢复后会自动启用)`);
      }
      probeState.failCount[id] = 0;
    }
  }
}

async function runHealthCheck() {
  if (probeState.running) return;
  probeState.running = true;
  // v11.11：轮次先递增再构建配置，确保探测歌曲池轮换从首轮生效
  const round = (globalThis.__probeRound = (globalThis.__probeRound || 0) + 1);
  const probeConfig = buildProbeConfig();
  const ids = Object.keys(probeConfig);
  logInfo(`健康探测: 开始第${round}轮，共${ids.length}个源(并发)`);
  // v11.8 P2：改并发探测，一轮从~50s降到~6s
  await Promise.all(ids.map(async id => {
    const result = await probeSingleSource(id, probeConfig[id]);
    applyProbeResult(id, result.usable);
  }));
  const active = Object.keys(runtimeToggles).filter(k => runtimeToggles[k]);
  logInfo(`健康探测: 本轮完成，当前自动启用: ${active.join(", ")}`);
  probeState.running = false;
}

function startHealthCheck() {
  setTimeout(async () => {
    try { await runHealthCheck(); } catch (e) { logWarn(`健康探测异常: ${e.message}`); }
    setTimeout(function tick() {
      runHealthCheck().then(() => {
        setTimeout(tick, HEALTH_CHECK_INTERVAL_MS);
      }).catch(() => {
        setTimeout(tick, HEALTH_CHECK_INTERVAL_MS);
      });
    }, HEALTH_CHECK_INTERVAL_MS);
  }, HEALTH_CHECK_INITIAL_DELAY_MS);
}

const Q = ["128k", "320k", "flac", "flac24bit"];
const PLATFORM_QUALITIES = { wy: Q, tx: Q, kw: Q, kg: Q, mg: Q };
// v11.8 P0-6：上报 qualitys 按真实能力裁剪——不再上报无人能交付的 flac24bit
const REPORT_QUALITIES = {
  wy: ["128k", "320k", "flac"],   // outer/suyin163=128k；GD Studio=flac；suyinKuwo=flac兜底
  tx: ["128k", "320k", "flac"],   // 仅 suyinKuwo 搜索酷我兜底
  kw: ["128k", "320k", "flac"],   // kuwoOfficial/xinghaiBackend=128k；suyinKuwo=flac
  kg: ["128k", "320k", "flac"],   // 仅 suyinKuwo 搜索酷我兜底
  mg: ["128k", "320k", "flac"]    // 仅 suyinKuwo 搜索酷我兜底
};

const PLATFORM_TO_XINGHAI_BACKUP = { wy: "netease", tx: "qq", kw: "kuwo" };
const QUALITY_TO_BR = { "128k": "128", "192k": "192", "320k": "320", flac: "740", flac24bit: "999", "24bit": "999" };
const QUALITY_TO_SUYIN_QQ_BR = { "128k": 7, "320k": 5, flac: 4, hires: 3, atmos: 2, master: 1, "24bit": 1 };
const QUALITY_TO_KUWO_BR = { flac: 1, "320k": 5, "128k": 7, "24bit": 1 };
const HIRES_QUALITY_SET = new Set(["24bit", "flac", "flac24bit", "hires", "master", "atmos"]);
// v11.8 P0-4：实际音质降级阶梯（去掉无源区分的192k短接），请求音质放首位再向下降级
const QUALITY_PRIORITY = ["flac24bit", "flac", "320k", "128k"];
// v11.8 P0-1：音质等级数值，用于源能力过滤与缓存音质校验
const QUALITY_RANK = { "128k": 1, "192k": 2, "320k": 3, flac: 4, flac24bit: 5, hires: 4, master: 5, atmos: 5, "24bit": 5 };
function qualityRank(q) { return QUALITY_RANK[String(q || "128k").toLowerCase()] || 1; }
const QUALITY_FIRST = true; // 音质优先模式：解析从请求音质(默认flac)开始逐级降级

const { EVENT_NAMES, request, on, send, utils, env, version } = globalThis.lx;

// ============================================================
// 第三部分：日志 + LRU双层缓存 + 断路器
// ============================================================
const LOG_ENABLED = true;
function logInfo(...args) { if (LOG_ENABLED) console.log("[聚合音源][信息]", ...args); }
function logWarn(...args) { if (LOG_ENABLED) console.warn("[聚合音源][警告]", ...args); }
function logError(...args) { if (LOG_ENABLED) console.error("[聚合音源][错误]", ...args); }

// v11.8：直接用原字符串作 Map 键（Map 支持字符串键），省掉32位哈希与碰撞覆盖
function createLRUCache(maxSize, ttl) {
  const map = new Map();
  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp >= ttl) { map.delete(key); return null; }
      map.delete(key);
      map.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      map.set(key, { value, timestamp: Date.now() });
      if (map.size > maxSize) {
        const firstKey = map.keys().next().value;
        if (firstKey !== undefined) map.delete(firstKey);
      }
    },
    hasExpired(key) {
      const entry = map.get(key);
      if (!entry) return false;
      return Date.now() - entry.timestamp >= ttl;
    },
    getExpired(key) {
      const entry = map.get(key);
      return entry ? entry.value : null;
    }
  };
}
const successCache = createLRUCache(CACHE_MAX_SIZE, CACHE_TTL_MS);
const failCache = createLRUCache(FAIL_CACHE_MAX_SIZE, FAIL_CACHE_TTL_MS);

const breakerMap = new Map();
function getBreaker(sourceId) {
  if (!breakerMap.has(sourceId)) {
    breakerMap.set(sourceId, { state: 'closed', failureCount: 0, lastFailureTime: 0, totalRequests: 0, totalSuccess: 0, totalTime: 0 });
  }
  return breakerMap.get(sourceId);
}
function canExecute(sourceId) {
  const b = getBreaker(sourceId);
  if (b.state === 'closed') return true;
  if (b.state === 'open') {
    if (Date.now() - b.lastFailureTime >= BREAKER_COOLDOWN_MS) {
      b.state = 'half-open';
      return true;
    }
    return false;
  }
  return false;
}
function recordSuccess(sourceId, duration) {
  const b = getBreaker(sourceId);
  b.totalRequests++;
  b.totalSuccess++;
  b.totalTime += duration;
  if (b.state === 'half-open') { b.state = 'closed'; b.failureCount = 0; logWarn(`断路器[${sourceId}] 半开试探成功，恢复`); }
  b.failureCount = 0;
}
function recordFailure(sourceId) {
  const b = getBreaker(sourceId);
  b.totalRequests++;
  b.failureCount++;
  b.lastFailureTime = Date.now();
  if (b.state === 'half-open') { b.state = 'open'; logWarn(`断路器[${sourceId}] 半开试探失败，重新熔断`); return; }
  if (b.state === 'closed' && b.failureCount >= BREAKER_THRESHOLD) {
    b.state = 'open';
    logWarn(`断路器[${sourceId}] 连续失败${BREAKER_THRESHOLD}次，熔断${BREAKER_COOLDOWN_MS / 1000}秒`);
  }
}
function getSourceStats(sourceId) {
  const b = getBreaker(sourceId);
  return {
    successRate: b.totalRequests === 0 ? 1 : b.totalSuccess / b.totalRequests,
    avgTime: b.totalSuccess === 0 ? 9999 : b.totalTime / b.totalSuccess,
    state: b.state
  };
}

// ============================================================
// 第四部分：HTTP 请求封装
// ============================================================
function httpRequest(url, options = { method: "GET" }) {
  const timeout = options.timeout || TIMEOUT_CONFIG.default;
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    request(url, { timeout, ...options }, (err, res) => {
      const duration = Date.now() - startTime;
      if (err) {
        const code = String(err.message || "").includes("timeout") ? ERROR_CODES.NETWORK_TIMEOUT : ERROR_CODES.NETWORK_ERROR;
        const error = new Error(`${code}: ${err.message}`);
        error.code = code;
        reject(error);
        return;
      }
      let body = res?.body;
      if (typeof body === "string") {
        const trimmed = body.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"')) {
          try { body = JSON.parse(trimmed); } catch (e) { /* 保持原始 */ }
        }
      }
      const result = { statusCode: res?.statusCode ?? 0, headers: res?.headers || {}, body, duration, url: res?.url || url };
      if (result.statusCode >= 500) {
        const error = new Error(`${ERROR_CODES.SERVER_ERROR}: HTTP ${result.statusCode}`);
        error.code = ERROR_CODES.SERVER_ERROR;
        reject(error);
      } else if (result.statusCode === 429) {
        const error = new Error(`${ERROR_CODES.RATE_LIMIT}: 被限流`);
        error.code = ERROR_CODES.RATE_LIMIT;
        reject(error);
      } else if (result.statusCode >= 400) {
        const error = new Error(`${ERROR_CODES.NETWORK_ERROR}: HTTP ${result.statusCode}`);
        error.code = ERROR_CODES.NETWORK_ERROR;
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

async function httpRequestWithRetry(url, options = {}, retries = RETRY_TIMES) {
  let lastError = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await httpRequest(url, options);
    } catch (e) {
      lastError = e;
      // 网络错误/超时/5xx临时错误重试；4xx(403/404)与429限流不重试
      if (e.code !== ERROR_CODES.NETWORK_TIMEOUT && e.code !== ERROR_CODES.NETWORK_ERROR && e.code !== ERROR_CODES.SERVER_ERROR) break;
      if (i < retries) {
        const delay = Math.pow(2, i) * 200;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

function buildQueryString(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? "?" + parts.join("&") : "";
}

async function httpGet(url, params = {}, timeoutType = 'default') {
  const fullUrl = url + buildQueryString(params);
  const res = await httpRequestWithRetry(fullUrl, { method: "GET", timeout: TIMEOUT_CONFIG[timeoutType] || TIMEOUT_CONFIG.default });
  return res.body;
}

async function httpPost(url, body = {}, timeout = 60000) {
  const res = await httpRequestWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    timeout
  });
  return res.body;
}

// v11.9 P0：轻量音频可播性判定——Range 取前1KB，206/200音频即视为可播；410/403/超时一律视为死链
async function isAudioPlayable(audioUrl, timeoutMs = 3000) {
  if (!audioUrl || typeof audioUrl !== "string" || !HTTP_URL_REGEX.test(audioUrl)) return false;
  try {
    const res = await httpRequest(audioUrl, {
      method: "GET",
      headers: { "User-Agent": getMobileUserAgent(), "Range": "bytes=0-1023" },
      timeout: timeoutMs,
      follow_max: 5
    });
    const ct = String(res.headers?.["content-type"] || "");
    if (res.statusCode === 206) return true;
    if (res.statusCode === 200 && /audio|octet|mpeg|mp3|flac|ogg|aac/i.test(ct)) return true;
    return false;
  } catch (e) {
    return false; // 410 Gone/403/超时/网络错误 均判定不可播
  }
}

// ============================================================
// 第五部分：歌曲信息与匹配工具
// ============================================================
function normalizeQuality(quality) {
  const q = String(quality || "").toLowerCase();
  if (q === "128k") return "low";
  if (q === "320k") return "standard";
  if (q === "flac" || q === "flac24bit" || q === "24bit") return "lossless";
  return "128k";
}

function selectQuality(requestedQuality, supportedQualities) {
  const requested = String(requestedQuality || "128k").toLowerCase();
  if (supportedQualities.includes(requested)) return requested;
  const idx = QUALITY_PRIORITY.indexOf(requested);
  const start = idx >= 0 ? idx : QUALITY_PRIORITY.length - 1;
  for (let i = start; i < QUALITY_PRIORITY.length; i++) {
    if (supportedQualities.includes(QUALITY_PRIORITY[i])) return QUALITY_PRIORITY[i];
  }
  for (let i = QUALITY_PRIORITY.length - 1; i >= 0; i--) {
    if (supportedQualities.includes(QUALITY_PRIORITY[i])) return QUALITY_PRIORITY[i];
  }
  return supportedQualities[0] || "128k";
}

function qualityToNetease(quality) {
  const q = String(quality || "128k").toLowerCase();
  if (q === "flac" || q === "flac24bit" || q === "hires" || q === "master" || q === "atmos" || q === "24bit") return "lossless";
  if (q === "320k" || q === "192k") return "exhigh";
  return "standard";
}

function qualityToSuyinQQ(quality) {
  const q = String(quality || "128k").toLowerCase();
  if (q === "flac24bit") return "hires";
  if (q === "192k") return "320k";
  return QUALITY_TO_SUYIN_QQ_BR[q] ? q : "128k";
}

function getMobileUserAgent() {
  return "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
}

function getSongId(songInfo) {
  return (songInfo?.id || songInfo?.songmid || songInfo?.songId || songInfo?.hash || songInfo?.rid || songInfo?.mid || songInfo?.strMediaMid || songInfo?.mediaId || "").toString();
}

function getHashOrMid(songInfo) {
  return songInfo?.hash ?? songInfo?.songmid ?? songInfo?.id ?? null;
}

function getQQSongId(songInfo) {
  const mid = songInfo?.meta?.qq?.mid || songInfo?.meta?.mid || songInfo?.songmid ||
    (typeof songInfo?.id === "string" && !/^\d+$/.test(songInfo.id) ? songInfo.id : null);
  if (mid) return { type: "mid", value: mid };
  const songid = songInfo?.meta?.qq?.songid || songInfo?.meta?.songid ||
    (typeof songInfo?.id === "number" ? songInfo.id :
      (typeof songInfo?.id === "string" && /^\d+$/.test(songInfo.id) ? Number(songInfo.id) : null));
  if (songid) return { type: "songid", value: songid };
  return null;
}

function normalizeSongInfo(raw) {
  const id = raw?.id || raw?.vid ? String(raw.id || raw.vid) : "";
  return {
    id, songmid: id, hash: id,
    name: raw?.name ? String(raw.name) : "未知歌曲",
    singer: raw?.artists ? String(raw.artists) : "未知歌手",
    albumName: raw?.album ? String(raw.album) : "",
    duration: raw?.duration ? Math.floor(Number(raw.duration) / 1000) : 0,
    pic: raw?.cover || raw?.pic ? String(raw.cover || raw.pic) : "",
    _raw: raw || {}
  };
}

function getFirstData(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data[0] || null;
  if (data && typeof data === "object" && data[0]) return data[0];
  return null;
}

function normalizeKeyword(keyword) {
  if (!keyword) return "";
  return String(keyword)
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .replace(/[^\w\u4e00-\u9fa5]/g, "")
    .trim()
    .toLowerCase();
}

function titleMatch(a, b) {
  const na = normalizeKeyword(a);
  const nb = normalizeKeyword(b);
  if (!na || !nb) return true;
  return na.includes(nb) || nb.includes(na);
}

function durationMatch(dur1, dur2, threshold = 5) {
  if (!dur1 || !dur2) return true;
  return Math.abs(Number(dur1) - Number(dur2)) <= threshold;
}

function buildSearchKeywords(songInfo) {
  const keywords = [];
  const name = songInfo?.name || "";
  const album = songInfo?.albumName || songInfo?.album || "";
  const singer = songInfo?.singer || "";
  if (name && album) {
    const kw = normalizeKeyword(name + album);
    if (kw) keywords.push({ keyword: kw, strict: true });
  }
  if (name && singer) {
    const kw = normalizeKeyword(name + singer);
    if (kw) keywords.push({ keyword: kw, strict: true });
  }
  if (name) {
    const kw = normalizeKeyword(name);
    if (kw) keywords.push({ keyword: kw, strict: false });
  }
  return keywords;
}

function songInfoMatch(responseData, songInfo) {
  const song = responseData?.song || responseData?.data?.song || "";
  const singer = responseData?.singer || responseData?.data?.singer || "";
  const album = responseData?.album || responseData?.data?.album || "";
  if (!titleMatch(song, songInfo?.name || "")) return false;
  if (songInfo?.singer && singer && !titleMatch(singer, songInfo.singer)) return false;
  if ((songInfo?.albumName || songInfo?.album) && album && !titleMatch(album, songInfo.albumName || songInfo.album)) return false;
  return true;
}

function parseMessageSongInfo(message) {
  if (!message) return null;
  const result = {};
  const lines = String(message).split("\n");
  for (const line of lines) {
    if (line.startsWith("歌名：")) result.song = line.replace("歌名：", "").trim();
    if (line.startsWith("歌手：")) result.singer = line.replace("歌手：", "").trim();
    if (line.startsWith("专辑：")) result.album = line.replace("专辑：", "").trim();
  }
  return result.song ? result : null;
}

function validateUrl(url, sourceName) {
  if (!url || typeof url !== "string") throw new Error(`${ERROR_CODES.NOT_FOUND}: ${sourceName}返回空URL`);
  if (!HTTP_URL_REGEX.test(url.trim())) throw new Error(`${ERROR_CODES.PARAM_ERROR}: ${sourceName}非法URL格式`);
  return url;
}

// v11.8 P1：缓存 key 加入 songId 维度，避免同名不同版本冲突
function buildCacheKey(prefix, songInfo, quality = "") {
  const id = songInfo?.id || songInfo?.songmid || songInfo?.hash || songInfo?.rid || "";
  const name = songInfo?.name || "";
  const singer = songInfo?.singer || "";
  const album = songInfo?.albumName || songInfo?.album || "";
  return `${prefix}_${id}_${name}_${singer}_${album}_${quality}`;
}

// v11.8 P1：缓存值记录实际音质 {url, quality}，命中/过期兜底时校验
function getCachedUrl(cacheKey) { return successCache.get(cacheKey); }
function setCachedUrl(cacheKey, url, quality) { successCache.set(cacheKey, { url, quality: quality || "128k" }); }
function setFailCached(failKey) { failCache.set(failKey, true); }

// ============================================================
// 第六部分：音源实现
// ============================================================

/* 网易云官方 outer 直连（免费歌302直链，固定128k，VIP/无版权歌404自动跳过） */
async function wyOuterGetUrl(platform, songId, quality, songInfo) {
  if (platform !== "wy") throw new Error(`${ERROR_CODES.PARAM_ERROR}: 网易云官方仅支持wy平台`);
  const id = songId ?? songInfo?.id ?? songInfo?.songmid;
  if (!id) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 网易云官方缺少歌曲ID`);
  const url = WY_OUTER_API.replace("{id}", encodeURIComponent(String(id)));
  const res = await httpRequestWithRetry(url, {
    method: "GET",
    headers: { "User-Agent": getMobileUserAgent() },
    timeout: TIMEOUT_CONFIG.parse,
    follow_max: 5
  });
  const ct = String(res.headers?.["content-type"] || "");
  if (res.statusCode !== 200 || !/audio|octet|mpeg/i.test(ct)) {
    throw new Error(`${ERROR_CODES.NOT_FOUND}: 网易云该歌曲不可试听(可能需VIP)，跳过`);
  }
  return res.url || url;
}

/* 酷我官方直连（自研：搜索 r.s → rid → convert_url，固定128k真实mp3，无第三方） */
function kuwoUnescape(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

async function kuwoOfficialSearch(keyword, rn = 10) {
  const url = `${KUWO_SEARCH_API}?client=kt&all=${encodeURIComponent(keyword)}&pn=0&rn=${rn}&ft=music&rformat=json&encoding=utf8`;
  const res = await httpRequestWithRetry(url, {
    method: "GET",
    headers: { "User-Agent": getMobileUserAgent() },
    timeout: TIMEOUT_CONFIG.search
  });
  const raw = typeof res.body === "string" ? res.body : String(res.body || "");
  // 酷我返回 Python repr 风格(单引号)，清洗为 JSON
  const cleaned = raw.replace(/'/g, '"');
  let parsed = null;
  try { parsed = JSON.parse(cleaned); } catch (e) { /* 解析失败走正则兜底 */ }
  if (parsed && Array.isArray(parsed.abslist)) {
    return parsed.abslist.map(item => ({
      rid: String(item.MP3RID || "").replace("MP3_", ""),
      name: kuwoUnescape(item.NAME),
      singer: kuwoUnescape(item.ARTIST),
      duration: Number(item.DURATION) || 0
    })).filter(i => i.rid);
  }
  // 正则兜底
  const items = [];
  const blockRe = /\{'MP3RID':'MP3_(\d+)'/g;
  let m;
  while ((m = blockRe.exec(raw))) {
    items.push({ rid: m[1], name: "", singer: "", duration: 0 });
  }
  return items;
}

async function kuwoOfficialConvert(rid) {
  if (!rid) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 酷我官方缺少rid`);
  const url = `${KUWO_CONVERT_API}?type=convert_url&rid=${encodeURIComponent(rid)}&format=mp3&response=url`;
  const res = await httpRequestWithRetry(url, {
    method: "GET",
    headers: { "User-Agent": getMobileUserAgent() },
    timeout: TIMEOUT_CONFIG.parse
  });
  const text = typeof res.body === "string" ? res.body.trim() : String(res.body || "").trim();
  if (!text || text === "refuse request!" || !HTTP_URL_REGEX.test(text)) {
    throw new Error(`${ERROR_CODES.NOT_FOUND}: 酷我官方convert_url未返回链接`);
  }
  return text;
}

async function kuwoOfficialGetUrl(platform, songId, quality, songInfo) {
  if (platform !== "kw") throw new Error(`${ERROR_CODES.PARAM_ERROR}: 酷我官方仅支持kw平台`);
  if (!songInfo?.name) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 酷我官方需要歌曲名`);
  const cacheKey = buildCacheKey("kwoff", songInfo, "128k");
  const cached = getCachedUrl(cacheKey);
  if (cached && cached.url) return cached.url;
  const targetName = normalizeKeyword(songInfo.name);
  const targetSinger = normalizeKeyword(songInfo.singer);
  const items = await kuwoOfficialSearch(`${songInfo.name} ${songInfo.singer || ""}`.trim(), 10);
  if (!items.length) throw new Error(`${ERROR_CODES.NOT_FOUND}: 酷我官方搜索无结果`);
  // 匹配优先级：歌名精确 → 歌名包含 → 第一首；歌手/时长辅助校验
  let match = null;
  for (const item of items) {
    if (normalizeKeyword(item.name) === targetName) { match = item; break; }
  }
  if (!match) {
    for (const item of items) {
      const n = normalizeKeyword(item.name);
      if (n && n.includes(targetName)) { match = item; break; }
    }
  }
  if (!match) match = items[0];
  const url = await kuwoOfficialConvert(match.rid);
  setCachedUrl(cacheKey, url, "128k");
  return url;
}

/* ikun 服务器源（需卡密，默认关闭；填入 IKUN_API_KEY 并开启开关后生效） */
async function ikunGetUrl(platform, songId, quality, songInfo) {
  if (!IKUN_API_KEY) throw new Error(`${ERROR_CODES.CONFIG_ERROR}: ikun未配置卡密`);
  if (platform !== "kw" && platform !== "wy") throw new Error(`${ERROR_CODES.PARAM_ERROR}: ikun仅支持kw/wy平台`);
  const id = songInfo?.hash ?? songInfo?.songmid ?? songId;
  if (!id) throw new Error(`${ERROR_CODES.PARAM_ERROR}: ikun缺少歌曲ID`);
  const url = `${IKUN_API}/url?source=${encodeURIComponent(platform)}&songId=${encodeURIComponent(id)}&quality=${encodeURIComponent(quality || "128k")}`;
  const res = await httpRequestWithRetry(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", "User-Agent": getMobileUserAgent(), "X-Request-Key": IKUN_API_KEY },
    timeout: TIMEOUT_CONFIG.parse,
    follow_max: 5
  });
  const body = res.body;
  if (!body || typeof body !== "object" || Number.isNaN(Number(body.code))) throw new Error(`${ERROR_CODES.SERVER_ERROR}: ikun返回无效`);
  const code = Number(body.code);
  if (code === 200 && body.url) return body.url;
  if (code === 403) throw new Error(`${ERROR_CODES.CONFIG_ERROR}: ikun卡密失效/鉴权失败`);
  if (code === 429) throw new Error(`${ERROR_CODES.RATE_LIMIT}: ikun请求过频`);
  throw new Error(`${ERROR_CODES.NOT_FOUND}: ikun ${body.message || "获取URL失败"}`);
}

/* GD Studio（v11.8接入：仅wy，br=999真实flac/br=320 320k/br=128 128k；限5min50次，仅用于wy高音质链，高音质优先、不进128k兜底竞速） */
async function gdWyGetUrl(platform, songId, quality, songInfo) {
  if (platform !== "wy") throw new Error(`${ERROR_CODES.PARAM_ERROR}: GD Studio仅支持网易云`);
  const id = songId ?? songInfo?.id;
  if (!id) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 缺少wy songId`);
  const q = String(quality || "flac").toLowerCase();
  const gdBrMap = { "128k": "128", "192k": "320", "320k": "320", flac: "999", flac24bit: "999", hires: "999" };
  const br = gdBrMap[q] || "320";
  const url = `${GD_API}&types=url&source=netease&id=${encodeURIComponent(id)}&br=${br}`;
  const res = await httpRequestWithRetry(url, {
    method: "GET",
    headers: { "User-Agent": "LX-Music-Mobile", Accept: "application/json" },
    timeout: TIMEOUT_CONFIG.parse
  });
  const body = res.body;
  if (!body || typeof body !== "object" || !body.url) throw new Error((body && body.message) || `${ERROR_CODES.NOT_FOUND}: GD Studio未返回可用URL`);
  return body.url;
}

/* 星海备（实测域名不可解析，默认关闭，保留函数便于恢复） */
async function xinghaiBackupGetUrl(platform, songId, quality, songInfo) {
  const source = PLATFORM_TO_XINGHAI_BACKUP[platform];
  if (!source) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 星海备不支持该平台`);
  const id = songId ?? getHashOrMid(songInfo);
  if (!id) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 缺少songId`);
  const selectedQuality = selectQuality(quality, ["128k", "320k"]);
  return `${XINGHAI_BACKUP_API}?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&type=url&br=${encodeURIComponent(selectedQuality)}`;
}

/* 星海后端主域聚合（v11.8：仅 kw、仅128k；code==200→url；wy签名URL本机403故不支持wy） */
function xinghaiBackendToken() {
  try {
    const payload = {
      device_id: 'lx-' + Math.random().toString(36).substring(2, 10),
      ip: '0.0.0.0',
      timestamp: Math.floor(Date.now() / 1000),
      random: Math.random().toString(36).substring(2, 12)
    };
    if (globalThis.lx?.utils?.buffer?.from) {
      const buf = globalThis.lx.utils.buffer.from(JSON.stringify(payload), 'utf-8');
      return globalThis.lx.utils.buffer.bufToString(buf, 'base64');
    }
    return btoa(JSON.stringify(payload));
  } catch (e) {
    return '';
  }
}
async function xinghaiBackendGetUrl(platform, songId, quality, songInfo) {
  if (platform !== "kw") {
    throw new Error(`${ERROR_CODES.PARAM_ERROR}: 星海后端主域仅接入kw(wy签名URL本机403疑绑定后端出口IP，需家庭宽带自验后再开)`);
  }
  // 仅128k可用；高音质请求在此直接失败，让上层降级到下一级音质/下一源
  if (String(quality || "128k").toLowerCase() !== "128k") {
    throw new Error(`${ERROR_CODES.NOT_FOUND}: 星海后端仅支持kw 128k，高音质跳过`);
  }
  const id = songId ?? getHashOrMid(songInfo) ?? "1";
  const params = {
    source: "kw",
    name: songInfo?.name || '',
    singer: songInfo?.singer || '',
    songmid: id,
    interval: songInfo?.interval || songInfo?.duration || '',
    albumName: songInfo?.albumName || songInfo?.album || '',
    quality: '128k'
  };
  const query = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const res = await httpRequestWithRetry(`${XINGHAI_BACKEND_API}?${query}`, {
    method: "GET",
    headers: {
      "X-Token": xinghaiBackendToken(),
      "X-Client": "lx-aggregate/11.7",
      "User-Agent": "LX-Music-Mobile"
    },
    timeout: TIMEOUT_CONFIG.parse
  });
  const body = res.body;
  if (!body || typeof body !== "object") throw new Error(`${ERROR_CODES.SERVER_ERROR}: 星海后端返回无效`);
  if (Number(body.code) !== 200 || !body.url) throw new Error(body.msg || `${ERROR_CODES.NOT_FOUND}: 星海后端无可用链接`);
  return body.url;
}

/* Huibq（实测仅酷我真实，其他平台假兜底，默认关闭） */
async function huibqGetUrl(platform, songId, quality, songInfo) {
  if (!HUIBQ_API || !HUIBQ_REQUEST_KEY) throw new Error(`${ERROR_CODES.CONFIG_ERROR}: Huibq未配置`);
  const songIdVal = songInfo?.hash ?? songInfo?.songmid ?? songId;
  if (!songIdVal) throw new Error(`${ERROR_CODES.PARAM_ERROR}: Huibq缺少ID`);
  const selectedQuality = selectQuality(quality, ["128k", "320k"]);
  const url = `${HUIBQ_API}/url/${platform}/${encodeURIComponent(songIdVal)}/${encodeURIComponent(selectedQuality)}`;
  const res = await httpRequestWithRetry(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", "User-Agent": getMobileUserAgent(), "X-Request-Key": HUIBQ_REQUEST_KEY },
    timeout: TIMEOUT_CONFIG.parse
  });
  const body = res.body;
  if (!body || typeof body !== "object" || Number.isNaN(Number(body.code))) throw new Error(`${ERROR_CODES.SERVER_ERROR}: Huibq返回无效`);
  if (Number(body.code) !== 0 || !body.url) throw new Error(body.msg || `${ERROR_CODES.NOT_FOUND}: Huibq未返回URL`);
  return body.url;
}

/* 聆川（未配置，默认关闭） */
async function lingchuanGetUrl(platform, songId, quality, songInfo) {
  if (!LINGCHUAN_API) throw new Error(`${ERROR_CODES.CONFIG_ERROR}: 聆川未配置`);
  const hashOrMid = songInfo?.hash ?? songInfo?.songmid;
  if (!hashOrMid) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 聆川缺少hash/songmid`);
  const selectedQuality = selectQuality(quality, ["320k", "128k"]);
  const url = `${LINGCHUAN_API}/url?source=${encodeURIComponent(platform)}&songId=${encodeURIComponent(hashOrMid)}&quality=${encodeURIComponent(selectedQuality)}`;
  const res = await httpRequestWithRetry(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", "User-Agent": getMobileUserAgent() },
    follow_max: 5,
    timeout: TIMEOUT_CONFIG.parse
  });
  const body = res.body;
  if (!body || typeof body !== "object" || Number.isNaN(Number(body.code))) throw new Error(`${ERROR_CODES.SERVER_ERROR}: 聆川返回无效`);
  if (Number(body.code) !== 200 || !body.url) throw new Error(body.message || `${ERROR_CODES.NOT_FOUND}: 聆川未返回URL`);
  return body.url;
}

/* 溯音QQ（实测-403维护中，默认关闭） */
async function suyinQQGetUrl(songInfo, quality) {
  const qqId = getQQSongId(songInfo);
  if (!qqId) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 溯音QQ缺少songmid/id`);
  const normalizedQuality = qualityToSuyinQQ(quality);
  const startBr = QUALITY_TO_SUYIN_QQ_BR[normalizedQuality] || QUALITY_TO_SUYIN_QQ_BR["128k"];
  const brList = [startBr, 4, 5, 7]
    .filter((val, idx, arr) => arr.indexOf(val) === idx && val >= startBr)
    .sort((a, b) => a - b);
  let lastError = null;
  for (const br of brList) {
    try {
      const reqParams = { key: SUYIN_QQ_KEY, type: "json", br, n: 1 };
      if (qqId.type === "mid") reqParams.mid = qqId.value;
      else reqParams.songid = qqId.value;
      const res = await httpGet(SUYIN_QQ_API, reqParams, 'parse');
      if (res?.music) return res.music;
      if (res?.url) return res.url;
      if (res?.message) {
        const match = String(res.message).match(/音频链接[：:](.+?)(?:\n|$)/);
        if (match && match[1]) return match[1].trim();
      }
      throw new Error(`${ERROR_CODES.NOT_FOUND}: 溯音QQ未找到音频链接`);
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error(`${ERROR_CODES.NOT_FOUND}: 溯音QQ全部音质尝试失败`);
}

/* 溯音163（免费歌真实128k直链，VIP歌url:null自动跳过，默认开启） */
async function suyin163GetUrl(songInfo) {
  const id = songInfo?.songmid || songInfo?.id;
  if (!id) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 溯音163缺少songmid/id`);
  const res = await httpGet(SUYIN_163_API, { id }, 'parse');
  if (res?.code === 0 && res?.data) {
    const item = Array.isArray(res.data) ? res.data[0] : res.data;
    if (item?.url) return item.url;
  }
  throw new Error(`${ERROR_CODES.NOT_FOUND}: 溯音163获取失败`);
}

/* 溯音酷我（实测可用：核心音源 + 全平台兜底，支持flac/320k/128k） */
async function suyinKuwoSearch(keyword, br, songInfo = null) {
  const res = await httpGet(SUYIN_KUWO_API, { msg: keyword, n: 1, br }, 'parse');
  if (res?.data?.url) {
    if (songInfo && !songInfoMatch(res, songInfo)) throw new Error(`${ERROR_CODES.MISMATCH}: 溯音酷我歌曲信息不匹配`);
    return res.data.url;
  }
  if (res?.message) {
    const match = String(res.message).match(/音乐链接[：:](\S+)/);
    if (match && match[1]) {
      if (songInfo) {
        const parsed = parseMessageSongInfo(res.message);
        if (parsed && !songInfoMatch(parsed, songInfo)) throw new Error(`${ERROR_CODES.MISMATCH}: 溯音酷我歌曲信息不匹配`);
      }
      return match[1];
    }
  }
  throw new Error(`${ERROR_CODES.NOT_FOUND}: 溯音酷我未找到链接`);
}

async function suyinKuwoGetUrl(songInfo, quality) {
  if (!songInfo?.name) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 溯音酷我需要歌曲名`);
  const cacheKey = buildCacheKey("kw", songInfo, quality);
  const cached = getCachedUrl(cacheKey);
  if (cached && cached.url) return cached.url;
  const selectedQuality = selectQuality(quality, ["flac", "320k", "128k"]);
  const br = QUALITY_TO_KUWO_BR[selectedQuality] || 1;
  const keywords = buildSearchKeywords(songInfo);
  let lastError = null;
  for (const item of keywords) {
    try {
      const url = await suyinKuwoSearch(item.keyword, br, item.strict ? songInfo : null);
      if (url) {
        // v11.9 P0：解析出的酷我CDN链接必须Range可播，否则视为签名过期死链(410)，不缓存、不计成功，继续下一源
        if (!await isAudioPlayable(url, 2500)) {
          throw new Error(`${ERROR_CODES.NOT_FOUND}: 溯音酷我签名URL已过期(CDN 410)，不可播`);
        }
        setCachedUrl(cacheKey, url, selectedQuality);
        return url;
      }
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error(`${ERROR_CODES.NOT_FOUND}: 溯音酷我失败`);
}

/* 溯音咪咕（实测502，默认关闭） */
async function suyinMiguGetUrl(songInfo) {
  if (!songInfo?.name) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 溯音咪咕需要歌曲名`);
  const cacheKey = buildCacheKey("mg", songInfo);
  const cached = getCachedUrl(cacheKey);
  if (cached && cached.url) return cached.url;
  const keywords = buildSearchKeywords(songInfo);
  let lastError = null;
  for (const item of keywords) {
    try {
      const res = await httpGet(SUYIN_MIGU_API, { gm: item.keyword, n: 1, num: 1, type: "json" }, 'parse');
      if (res?.code === 200 && res?.musicInfo) {
        if (item.strict && !songInfoMatch(res, songInfo)) throw new Error(`${ERROR_CODES.MISMATCH}: 溯音咪咕歌曲信息不匹配`);
        setCachedUrl(cacheKey, res.musicInfo, "128k");
        return res.musicInfo;
      }
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error(`${ERROR_CODES.NOT_FOUND}: 溯音咪咕失败`);
}

/* 溯音统一入口 */
async function suyinGetUrl(platform, songId, quality, songInfo) {
  switch (platform) {
    case "tx": return suyinQQGetUrl(songInfo, quality);
    case "wy": return suyin163GetUrl(songInfo);
    case "kw": return suyinKuwoGetUrl(songInfo, quality);
    case "mg": return suyinMiguGetUrl(songInfo);
    default: throw new Error(`${ERROR_CODES.PARAM_ERROR}: 溯音不支持该平台`);
  }
}

/* 长青SVIP（v11.9实测仅kw恢复：302→car-er.kuwo.cn新鲜mp3；wy/tx/kg/mg仍403/401/404，不可接） */
async function changqingGetUrl(platform, songId, quality, songInfo) {
  if (platform !== "kw") throw new Error(`${ERROR_CODES.PARAM_ERROR}: 长青今日仅kw恢复(其余平台仍403/401/404)`);
  const id = getPlatformSongId(platform, songInfo);
  if (!id) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 长青缺少kw rid`);
  // 仅128k测通，固定standard级别，忽略请求音质
  const target = CHANGQING_URL_TEMPLATES.kw.replace("{id}", encodeURIComponent(String(id))).replace("{level}", encodeURIComponent("standard"));
  // v11.9：跟随302取car-er.kuwo.cn新鲜mp3直链（Range轻量校验，不下载全曲）
  const res = await httpRequestWithRetry(target, {
    method: "GET",
    headers: { "User-Agent": getMobileUserAgent(), "Range": "bytes=0-1023" },
    timeout: TIMEOUT_CONFIG.parse,
    follow_max: 5
  });
  const finalUrl = res.url || target;
  if (!HTTP_URL_REGEX.test(finalUrl) || /kw\.php/.test(finalUrl)) {
    throw new Error(`${ERROR_CODES.NOT_FOUND}: 长青kw未跟随到音频直链`);
  }
  return finalUrl;
}

/* 念心SVIP（v11.9实测仅kw恢复：302→car-er.kuwo.cn新鲜mp3；其余平台仍404，不可接） */
async function nianxinGetUrl(platform, songId, quality, songInfo) {
  if (platform !== "kw") throw new Error(`${ERROR_CODES.PARAM_ERROR}: 念心今日仅kw恢复(其余平台仍404)`);
  const id = getPlatformSongId(platform, songInfo);
  if (!id) throw new Error(`${ERROR_CODES.PARAM_ERROR}: 念心缺少kw rid`);
  const target = NIANXIN_URL_TEMPLATES.kw.replace("{id}", encodeURIComponent(String(id))).replace("{level}", encodeURIComponent("standard"));
  const res = await httpRequestWithRetry(target, {
    method: "GET",
    headers: { "User-Agent": getMobileUserAgent(), "Range": "bytes=0-1023" },
    timeout: TIMEOUT_CONFIG.parse,
    follow_max: 5
  });
  const finalUrl = res.url || target;
  if (!HTTP_URL_REGEX.test(finalUrl) || /nxinxz\.com/.test(finalUrl)) {
    throw new Error(`${ERROR_CODES.NOT_FOUND}: 念心kw未跟随到音频直链`);
  }
  return finalUrl;
}

function getPlatformSongId(platform, songInfo) {
  if (platform === "kg") return songInfo?.hash || songInfo?.songmid || songInfo?.id || songInfo?.rid || songInfo?.mid || null;
  if (platform === "tx") {
    const qqId = getQQSongId(songInfo);
    if (qqId?.value) return qqId.value;
  }
  return songInfo?.songmid || songInfo?.id || songInfo?.songId || songInfo?.rid || songInfo?.hash || null;
}

// ============================================================
// 第七部分：音源注册表 + 调度（源级音质过滤 + 竞速回退 + 6s整体超时）
// ============================================================
// v11.8 P0-1：每个源标注 maxQuality 真实能力；buildSourceChain 按请求音质过滤，杜绝128k源冒充flac竞速
const SOURCE_HANDLERS = {
  gdWy: { id: "gdWy", name: "GD Studio(网易)", fn: gdWyGetUrl, maxQuality: "flac" },
  wyOuter: { id: "wyOuter", name: "网易云官方", fn: wyOuterGetUrl, maxQuality: "128k" },
  kuwoOfficial: { id: "kuwoOfficial", name: "酷我官方直连", fn: kuwoOfficialGetUrl, maxQuality: "128k" },
  ikun: { id: "ikun", name: "ikun", fn: ikunGetUrl, maxQuality: "flac" },
  xinghaiBackup: { id: "xinghaiBackup", name: "星海备", fn: xinghaiBackupGetUrl, maxQuality: "128k" },
  xinghaiBackend: { id: "xinghaiBackend", name: "星海后端", fn: xinghaiBackendGetUrl, maxQuality: "128k" },
  huibq: { id: "huibq", name: "Huibq", fn: huibqGetUrl, maxQuality: "320k" },
  lingchuan: { id: "lingchuan", name: "聆川", fn: lingchuanGetUrl, maxQuality: "320k" },
  suyinQQ: { id: "suyinQQ", name: "溯音QQ", fn: (platform, songId, quality, songInfo) => suyinGetUrl("tx", songId, quality, songInfo), maxQuality: "flac" },
  suyin163: { id: "suyin163", name: "溯音163", fn: (platform, songId, quality, songInfo) => suyinGetUrl("wy", songId, quality, songInfo), maxQuality: "128k" },
  suyinKuwo: { id: "suyinKuwo", name: "溯音酷我", fn: (platform, songId, quality, songInfo) => suyinKuwoGetUrl(songInfo, quality), maxQuality: "flac" },
  suyinMigu: { id: "suyinMigu", name: "溯音咪咕", fn: (platform, songId, quality, songInfo) => suyinGetUrl("mg", songId, quality, songInfo), maxQuality: "flac" },
  changqingVip: { id: "changqingVip", name: "长青kw", fn: changqingGetUrl, maxQuality: "128k" },
  nianxinVip: { id: "nianxinVip", name: "念心kw", fn: nianxinGetUrl, maxQuality: "128k" }
};

// 构建音源链：按平台 + 请求音质过滤源能力（maxQuality >= 请求音质），高音质源在前
function buildSourceChain(platform, quality) {
  const chain = [];
  const t = runtimeToggles;
  const q = String(quality || "128k").toLowerCase();
  const canDo = (h) => qualityRank(h.maxQuality) >= qualityRank(q);
  const push = (h) => { if (h && canDo(h)) chain.push(h); };

  if (platform === "kw") {
    // 高音质(flac/320k)：只有溯音酷我；128k：溯音酷我 + 星海后端 + 酷我官方 + 长青 + 念心 多源竞速兜底
    if (t.suyinKuwo) push(SOURCE_HANDLERS.suyinKuwo);
    if (t.xinghaiBackend) push(SOURCE_HANDLERS.xinghaiBackend);
    if (t.kuwoOfficial) push(SOURCE_HANDLERS.kuwoOfficial);
    // v11.9：长青/念心 kw 128k，排在现有稳定源之后
    if (t.changqingVip) push(SOURCE_HANDLERS.changqingVip);
    if (t.nianxinVip) push(SOURCE_HANDLERS.nianxinVip);
    if (t.ikun) push(SOURCE_HANDLERS.ikun);
  }
  if (platform === "wy") {
    // 高音质(flac/320k)：GD Studio 优先(高音质补充)，suyinKuwo 搜索兜底；
    // 128k：suyin163 + wyOuter 官方直连优先（GD Studio 不进128k链，省配额）
    if (t.gdWy && (q === "flac" || q === "flac24bit" || q === "320k" || q === "hires")) push(SOURCE_HANDLERS.gdWy);
    if (t.suyin163) push(SOURCE_HANDLERS.suyin163);
    if (t.wyOuter) push(SOURCE_HANDLERS.wyOuter);
    if (t.ikun) push(SOURCE_HANDLERS.ikun);
  }
  // 全平台兜底（kw 已在上面 push，这里其余平台追加）
  if (t.suyinKuwo && platform !== "kw") push(SOURCE_HANDLERS.suyinKuwo);
  // 其他平台/备用源
  if (t.suyinQQ && platform === "tx") push(SOURCE_HANDLERS.suyinQQ);
  if (t.suyinMigu && platform === "mg") push(SOURCE_HANDLERS.suyinMigu);
  if (t.xinghaiBackup && platform !== "kg") push(SOURCE_HANDLERS.xinghaiBackup);
  // 长青/念心已在 kw 块内按 kw-only 顺序 push（maxQuality=128k，仅进kw 128k链）
  if (t.huibq) push(SOURCE_HANDLERS.huibq);
  if (t.lingchuan) push(SOURCE_HANDLERS.lingchuan);
  return chain;
}

function sortChainByHealth(chain) {
  return chain.slice().sort((a, b) => {
    const sa = getSourceStats(a.id);
    const sb = getSourceStats(b.id);
    const rateDiff = sb.successRate - sa.successRate;
    if (Math.abs(rateDiff) > 0.05) return rateDiff;
    return sa.avgTime - sb.avgTime;
  });
}

function raceFirst(promises) {
  return new Promise((resolve, reject) => {
    let remaining = promises.length;
    let lastError = null;
    for (const p of promises) {
      Promise.resolve(p).then(resolve, e => {
        lastError = e;
        if (--remaining === 0) reject(lastError);
      });
    }
  });
}

async function wrapExecute(handler, platform, songInfo, quality) {
  if (!canExecute(handler.id)) {
    throw new Error(`${ERROR_CODES.RATE_LIMIT}: 音源[${handler.name}]已熔断`);
  }
  const startTime = Date.now();
  try {
    const url = await handler.fn(platform, getHashOrMid(songInfo), quality, songInfo);
    recordSuccess(handler.id, Date.now() - startTime);
    const finalUrl = validateUrl(url, handler.name);
    logInfo(`[${handler.name}] 解析成功: ${songInfo?.name || ""} 音质[${quality || "128k"}]`);
    return finalUrl;
  } catch (e) {
    recordFailure(handler.id);
    throw e;
  }
}

// v11.8 P0-5：fallbackRace 加 6s 整体超时；超时后继续 rest 串行
async function fallbackRace(chain, platform, songInfo, quality) {
  if (chain.length === 1) {
    return wrapExecute(chain[0], platform, songInfo, quality);
  }
  const firstBatch = chain.slice(0, 3);
  const rest = chain.slice(3);
  const errors = [];
  let timeoutHandle;
  const overallTimeout = new Promise((_, rej) => {
    timeoutHandle = setTimeout(() => rej(new Error(`RACE_TIMEOUT:${RACE_OVERALL_TIMEOUT_MS}ms整体超时`)), RACE_OVERALL_TIMEOUT_MS);
  });
  try {
    const winner = await Promise.race([
      raceFirst(firstBatch.map(h => wrapExecute(h, platform, songInfo, quality))),
      overallTimeout
    ]);
    clearTimeout(timeoutHandle);
    return winner;
  } catch (e) { errors.push(e.message); }
  for (const handler of rest) {
    try {
      return await wrapExecute(handler, platform, songInfo, quality);
    } catch (e) { errors.push(`${handler.name}: ${e.message}`); }
  }
  throw new Error(errors.join("; "));
}

// v11.8 P0-4：请求音质放首位，再按 QUALITY_PRIORITY 向下降级，截到≤3级；flac24bit/192k不再被短路
function buildQualityChain(requested) {
  const req = String(requested || "flac").toLowerCase();
  if (QUALITY_FIRST) {
    const chain = [req];
    const idx = QUALITY_PRIORITY.indexOf(req);
    if (idx >= 0) {
      for (let i = idx + 1; i < QUALITY_PRIORITY.length && chain.length < 3; i++) {
        chain.push(QUALITY_PRIORITY[i]);
      }
    } else {
      for (const q of ["flac", "320k", "128k"]) {
        if (!chain.includes(q) && chain.length < 3) chain.push(q);
      }
    }
    return chain;
  }
  const req2 = String(requested || "128k").toLowerCase();
  const idx2 = QUALITY_PRIORITY.indexOf(req2);
  const start = idx2 >= 0 ? idx2 : QUALITY_PRIORITY.length - 1;
  const chain = [];
  for (let i = start; i < QUALITY_PRIORITY.length; i++) {
    chain.push(QUALITY_PRIORITY[i]);
  }
  if (!chain.includes(req2)) chain.unshift(req2);
  return chain;
}

async function getUrlWithFallback(platform, songInfo, quality) {
  if (!platform || typeof platform !== "string" || !PLATFORM_QUALITIES[platform]) {
    throw new Error(`${ERROR_CODES.PARAM_ERROR}: 无效的平台参数`);
  }
  if (!songInfo || typeof songInfo !== "object") {
    throw new Error(`${ERROR_CODES.PARAM_ERROR}: 无效的歌曲信息`);
  }

  const cacheKey = buildCacheKey(platform, songInfo, quality);

  // 1. 成功缓存命中（缓存值带实际音质）
  const cached = getCachedUrl(cacheKey);
  if (cached && cached.url) return cached.url;

  // 2. 失败缓存命中
  const failKey = buildCacheKey(`fail_${platform}`, songInfo, quality);
  if (failCache.get(failKey)) {
    throw new Error(`${ERROR_CODES.NOT_FOUND}: 该请求5分钟内已知失败，跳过`);
  }

  const errors = [];

  // 3. 音质降级链（请求音质首位→向下降级；链内按源能力过滤，末级必有源）
  const qualityChain = buildQualityChain(quality || (QUALITY_FIRST ? "flac" : "128k"));
  for (const q of qualityChain) {
    const selectedQuality = selectQuality(q, PLATFORM_QUALITIES[platform]);
    const chain = sortChainByHealth(buildSourceChain(platform, selectedQuality));
    if (!chain.length) {
      errors.push(`[${q}] 无可用音源`);
      continue;
    }
    try {
      const url = await fallbackRace(chain, platform, songInfo, selectedQuality);
      setCachedUrl(cacheKey, url, selectedQuality); // v11.8：记录实际音质
      return url;
    } catch (e) {
      errors.push(`[${q}] ${e.message}`);
    }
  }

  // 4. 过期缓存兜底：仅当过期记录的实际音质不低于请求音质时才返回（防128k冒充flac）
  if (successCache.hasExpired(cacheKey)) {
    const expired = successCache.getExpired(cacheKey);
    if (expired && expired.url) {
      if (qualityRank(expired.quality || "128k") >= qualityRank(quality)) {
        logWarn(`全部音源失败，返回过期缓存兜底(缓存音质${expired.quality}, 请求${quality})`);
        return expired.url;
      }
      logWarn(`过期缓存音质(${expired.quality})低于请求(${quality})，不兜底`);
    }
  }

  // 5. 记录失败缓存
  setFailCached(failKey);
  throw new Error(`${ERROR_CODES.NOT_FOUND}: 所有源均失败 [${errors.join(" | ")}]`);
}

// ============================================================
// 第八部分：音源配置上报 + 事件监听（洛雪官方协议）
// ============================================================
const sourceConfig = {};
const PLATFORM_NAMES = {
  wy: "网易云音乐", tx: "QQ音乐", kw: "酷我音乐", kg: "酷狗音乐", mg: "咪咕音乐"
};
Object.keys(PLATFORM_QUALITIES).forEach(platform => {
  sourceConfig[platform] = {
    name: PLATFORM_NAMES[platform],
    type: "music",
    actions: ["musicUrl"],
    qualitys: REPORT_QUALITIES[platform] || ["128k"] // v11.8 P0-6：按真实能力裁剪
  };
});

on(EVENT_NAMES.request, ({ action, source, info }) => {
  if (action !== "musicUrl") {
    return Promise.reject(new Error(`${ERROR_CODES.PARAM_ERROR}: action not support`));
  }
  if (!info?.musicInfo) {
    return Promise.reject(new Error(`${ERROR_CODES.PARAM_ERROR}: 请求参数不完整`));
  }
  return getUrlWithFallback(source, info.musicInfo, info.type || (QUALITY_FIRST ? "flac" : "128k"))
    .catch(err => Promise.reject(err));
});

send(EVENT_NAMES.inited, {
  status: true,
  openDevTools: false,
  sources: sourceConfig
});

logInfo(`豆包定制聚合音源 v11.11 已加载，上报 ${Object.keys(sourceConfig).length} 个音源；溯音酷我128k恢复·kw五路兜底满编；探测歌曲池轮换(晴天/海阔天空/稻香)防风控；v11.10双音质分域探测/音质校验/音质优先均保留`);

// 启动健康探测（全自动自愈）
startHealthCheck();
