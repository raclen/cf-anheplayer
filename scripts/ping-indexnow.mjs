// IndexNow 主动推送：把站点 URL 提交给 Bing / Yandex / Seznam 等参与 IndexNow 的搜索引擎。
// 无需账号，只需在站点根部署 <key>.txt 证明所有权。用法：
//   node scripts/ping-indexnow.mjs            # 推送默认四个页面
//   node scripts/ping-indexnow.mjs /mobile/   # 只推送指定路径
const SITE = "https://anhe-player.loc.cc";
const KEY = "c21306f68993193c22e4182bbc1d08a5";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_PATHS = ["/", "/mobile/", "/downloader/", "/sources/"];

const paths = process.argv.slice(2);
const urlList = (paths.length ? paths : DEFAULT_PATHS).map(
  (p) => `${SITE}${p.startsWith("/") ? p : `/${p}`}`,
);

const main = async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  // IndexNow 成功返回 200/202；400 表示请求格式错误，403 表示 key 校验失败，422 表示 URL 与 host 不匹配
  console.log(`[indexnow] ${res.status} ${res.statusText} -> ${urlList.join(", ")}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(body.slice(0, 500));
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});