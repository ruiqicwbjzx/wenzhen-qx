// 问真八字 ProxyPin 脚本
// 请求阶段: 把 guid/userguid/userGuid/UserGuid 和 parm 里的身份换成已授权账号, vip 参数改成 3
// 响应阶段: 会员字段改成永久会员; 合盘接口返回空对象时用已授权身份重取
//
// 匹配 URL 填: https://bzapi*.iwzbz.com,https://bzpp3.iwzbz.com,https://hwbzpp.iwzbz.com

const AUTH_GUID = "8cdb5cd8-73ef-4a5c-8b18-520787eee2f8";
const GUID_KEYS = ["guid", "userguid", "userGuid", "UserGuid"];

function replaceGuid(queries) {
  if (!queries) return;
  for (const key of GUID_KEYS) {
    for (const k of Object.keys(queries)) {
      if (k.toLowerCase() === key.toLowerCase()) queries[k] = AUTH_GUID;
    }
  }
  if (queries.vip !== undefined && /^\d+$/.test(String(queries.vip))) queries.vip = "3";
  if (queries.parm) {
    queries.parm = String(queries.parm).replace(
      /^[0-9a-fA-F\-]+\|[0-9a-fA-F\-]+(\|)/,
      AUTH_GUID + "|" + AUTH_GUID + "$1"
    );
  }
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

async function onRequest(context, request) {
  replaceGuid(request.queries);
  return request;
}

async function onResponse(context, request, response) {
  let body = response.body;

  if (typeof body === "string" && /\/hepan3\.php/.test(request.url)) {
    let empty = false;
    try { empty = Object.keys(JSON.parse(body)).length === 0; } catch (e) { empty = false; }
    if (empty && request.queries && request.queries.guid && request.queries.guid !== AUTH_GUID) {
      const fixed = request.url.replace(/([?&]guid=)[0-9a-fA-F\-]*/i, "$1" + AUTH_GUID);
      try {
        const text = await fetch(fixed).then(r => r.text());
        if (text && text.length > 2) body = text;
      } catch (e) {}
    }
  }

  try {
    const data = JSON.parse(body);
    patchVip(data);
    response.body = JSON.stringify(data);
  } catch (e) {}
  return response;
}
