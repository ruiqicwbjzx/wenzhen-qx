const AUTH_GUID = "8cdb5cd8-73ef-4a5c-8b18-520787eee2f8";
const GUID_KEYS = ["guid", "userguid", "userGuid", "UserGuid"];

function replaceGuid(url) {
  let out = url;
  for (const key of GUID_KEYS) {
    const re = new RegExp("([?&])" + key + "=[0-9a-fA-F\\-]*", "g");
    out = out.replace(re, "$1" + key + "=" + AUTH_GUID);
  }
  out = out.replace(/([?&]vip=)\d+/gi, "$13");
  // getWXPW_nv1?parm=<guid>|<guid>|<其他>
  out = out.replace(
    /([?&]parm=)[0-9a-fA-F\-]+\|[0-9a-fA-F\-]+(\|)/g,
    "$1" + AUTH_GUID + "|" + AUTH_GUID + "$2"
  );
  return out;
}

function patchVip(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(patchVip);
    return;
  }
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase();
    if (lk === "vip" || lk === "viplevel") obj[k] = typeof obj[k] === "string" ? "3" : 3;
    else if (lk === "expires") obj[k] = "2099-12-31 00:00:00";
    else patchVip(obj[k]);
  }
}

// 合盘接口对非授权 guid 返回空对象 {}, 前端拿到空对象会一直停在"加载中..."
function hepanFallback(url, body) {
  if (!/\/hepan3\.php\?/.test(url)) return null;
  let empty = false;
  try {
    empty = Object.keys(JSON.parse(body)).length === 0;
  } catch (e) {
    return null;
  }
  if (!empty) return null;
  const fixed = url.replace(/([?&]guid=)[0-9a-fA-F\-]*/i, "$1" + AUTH_GUID);
  if (fixed === url) return null;
  try {
    const resp = $task.fetch({ url: fixed });
    const text = resp && resp.body != null ? String(resp.body) : "";
    return text.length > 2 ? text : null;
  } catch (e) {
    return null;
  }
}

if (typeof $request !== "undefined" && typeof $response === "undefined") {
  $done({ url: replaceGuid($request.url) });
} else {
  let body = $response.body;
  const fallback = hepanFallback($response.url || "", body);
  if (fallback) body = fallback;
  try {
    const data = JSON.parse(body);
    patchVip(data);
    body = JSON.stringify(data);
  } catch (e) {}
  $done({ body });
}
