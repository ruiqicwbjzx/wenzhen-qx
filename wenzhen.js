/**************************************
 * 问真八字 查询脚本 (Quantumult X)
 * 将请求中的用户身份 guid 替换为已授权账号,
 * 并将会员字段改写为永久会员
 *
 * [rewrite_local]
 * ^https?:\/\/(bzapi\d*|bzpp3|hwbzpp)\.iwzbz\.com\/ url script-request-header https://cdn.jsdelivr.net/gh/ruiqicwbjzx/wenzhen-qx@main/wenzhen.js
 * ^https?:\/\/(bzapi\d*|bzpp3|hwbzpp)\.iwzbz\.com\/ url script-response-body https://cdn.jsdelivr.net/gh/ruiqicwbjzx/wenzhen-qx@main/wenzhen.js
 *
 * [mitm]
 * hostname = *.iwzbz.com
 **************************************/

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

if (typeof $request !== "undefined") {
  $done({ url: replaceGuid($request.url) });
} else {
  let body = $response.body;
  try {
    const data = JSON.parse(body);
    patchVip(data);
    body = JSON.stringify(data);
  } catch (e) {}
  $done({ body });
}
