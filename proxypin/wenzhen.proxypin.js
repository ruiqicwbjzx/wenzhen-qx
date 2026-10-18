// 问真八字 ProxyPin 脚本
// 匹配 URL 填: *bzapi*.iwzbz.com*,*bzpp3.iwzbz.com*,*hwbzpp.iwzbz.com*
// 不要用 *iwzbz.com*，那会把图片和 js 也送进脚本

var AUTH_GUID = "8cdb5cd8-73ef-4a5c-8b18-520787eee2f8";
var GUID_KEYS = ["guid", "userguid", "userGuid", "UserGuid"];

function replaceGuid(queries) {
  if (!queries) return;
  var keys = Object.keys(queries);
  var i, j;
  for (i = 0; i < GUID_KEYS.length; i++) {
    for (j = 0; j < keys.length; j++) {
      if (keys[j].toLowerCase() === GUID_KEYS[i].toLowerCase()) queries[keys[j]] = AUTH_GUID;
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
  var ks = Object.keys(obj);
  var i;
  for (i = 0; i < ks.length; i++) {
    var lk = ks[i].toLowerCase();
    if (lk === "vip" || lk === "viplevel") obj[ks[i]] = typeof obj[ks[i]] === "string" ? "3" : 3;
    else if (lk === "expires") obj[ks[i]] = "2099-12-31 00:00:00";
    else patchVip(obj[ks[i]]);
  }
}

function onRequest(context, request) {
  console.log("wenzhen onRequest " + request.url);
  // 会员中心的账号资料接口保留用户自己的 guid，其余接口替换
  if (!/\/getnewuserinfo/i.test(request.url)) replaceGuid(request.queries);
  return request;
}

function onResponse(context, request, response) {
  var body = response.body;

  if (typeof body === "string" && body.length < 3 && /\/hepan3\.php/.test(request.url) &&
      request.queries && request.queries.guid && request.queries.guid !== AUTH_GUID) {
    try {
      var fixed = request.url.replace(/([?&]guid=)[0-9a-fA-F\-]*/i, "$1" + AUTH_GUID);
      var xhr = new XMLHttpRequest();
      xhr.open("GET", fixed);
      xhr.send(null);
      if (xhr.responseText && xhr.responseText.length > 2) body = xhr.responseText;
    } catch (e) {}
  }

  if (typeof body === "string") {
    try {
      var data = JSON.parse(body);
      patchVip(data);
      // getuserlevel 返回 "等级数字,等级名称"，会员显示为大法弟子
      if (/\/getuserlevel/i.test(request.url) && typeof data.data === "string" && data.data.indexOf(",") > 0) {
        data.data = "3,大法弟子";
      }
      response.body = JSON.stringify(data);
    } catch (e) {}
  }
  return response;
}
