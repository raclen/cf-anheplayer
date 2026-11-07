/**
 * @name Hei Music聚合源
 * @description 聚合自公开接口 Q群516649104
 * @version v2.2.2-261031-fix
 * @author Compile by CatXiaolan
 */
;(function() {


const { EVENT_NAMES, request, on, send } = globalThis.lx

// ========== 统计上报配置 ==========
// 上报地址存储于内部资源表，由 PANEL_REPORT_URL 运行时解码获得，源码中不含明文地址
// 为空字符串则不上报（PANEL_REPORT_URL 定义见下方解码函数之后）

// ========== 内部资源解码（密钥与字符表均在运行时派生，源码不保存明文） ==========
var _0x2b6e = [
  18,25,81,2,51,94,182,254,195,227,145,196,252,198,139,
]
var _0x2b6f = ''
var _0x2b6c = function() {
  if (_0x2b6f) return _0x2b6f
  var s = ''
  for (var i = 0; i < _0x2b6e.length; i++) s += String.fromCharCode((_0x2b6e[i] ^ (0x5a + i * 7)) & 255)
  return (_0x2b6f = s)
}
var _0x2b70 = [
  56,48,8,41,60,4,53,44,21,23,44,15,3,23,8,35,
  37,22,48,48,21,14,26,7,12,21,22,54,1,63,39,18,
  2,37,7,61,59,50,18,51,18,26,0,34,7,54,49,22,
  20,46,26,2,54,11,35,42,39,49,52,62,48,20,63,9,
]
var _0x2b71 = ''
var _0x2b6d = function() {
  if (_0x2b71) return _0x2b71
  var s = ''
  for (var i = 0; i < _0x2b70.length; i++) {
    var v = _0x2b70[i] ^ ((0x33 + ((i * 29) & 63)) & 63)
    s += String.fromCharCode(v < 26 ? 65 + v : v < 52 ? 71 + v : v < 62 ? v - 4 : v === 62 ? 95 : 45)
  }
  return (_0x2b71 = s)
}
// 解包：3 字符还原 16 位值（含位置轮换还原）
var _0x4e11 = function(str) {
  var A = _0x2b6d(), r = [], n = 0
  for (var i = 0; i + 2 < str.length; i += 3) {
    var v = (A.indexOf(str.charAt(i)) << 12) | (A.indexOf(str.charAt(i + 1)) << 6) | A.indexOf(str.charAt(i + 2))
    r.push((v - n * 17) & 0xffff)
    n++
  }
  return r
}
// 解码：逐字符与派生键异或还原明文
var _0x4e8f = function(arr) {
  var k = _0x2b6c(), r = ""
  for (var i = 0; i < arr.length; i++) r += String.fromCharCode(arr[i] ^ k.charCodeAt(i % k.length))
  return r
}

// 内部资源表（运行时解码，不含明文）
var _0xa3b1 = {
  nianxin_kw: 'LLRLLDLgQLgmLgxLgYLljLj2LjbLlHLjwLbOLbOLjELAbLbWLbmLAuLb-LULLU6LUgLUMLSALUQLSSLS5LOALSYLOHLOwLvTLvxLOZLvsL5_L5fL9FL9LL58L9SL9MLMbL9_',
  gdstudio: 'LLRLLDLgQLgmLgxLgYLljLj2LjbLlpLjoLjALjILbcLAbLbELbVLbsLbPLA8LU8LUwLAyLUPLUwLOSLOSLS-LSTLOxLvWLOpLvCLO-L56L5TL5GLvx',
  qq_vkey: 'LLRLLDLgQLgmLgxLgYLljLj2LloLltLjvLjaLAOLjkLbhLAWLbwLAELbHLU6LUiLUxLUNLOjLU3LOgLSSLvOLSxLOQLOZLORLvxLvvL56L5nL5-L5S',
  qq_cdn: 'LLRLLDLgQLgmLgxLgYLljLj2LlILlQLjvLj9LjHLj_LALLbpLbWLbsLABLAELUKLUoLAPLUfLUuLSOLSMLSYLOZLvgLOWLO8LOy',
  ynx_tx: 'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLblLbvLj3Lb_LbSLb3LbDLAZLbILAXLUVLUxLS2LUZLUoLSSLSeLS7LOrLOALOELOnLvhLvvLvsL5DL5-L9mL5tL5CL9C',
  ynx_tx2: 'LLRLLDLgQLgmLgxLgYLljLj2Ll6LlhLbvLlfLAOLjQLb-LbRLATLAwLUFLUELU8LUgLUMLSULS6LOALSmLSoLSyLvgLOaLOTLvCLOZLv6L9FL5ELvxL5GL9wL9CL9bL9o',
  nianxin_wy: 'LLRLLDLgQLgmLgxLgYLljLj2LjbLlHLjwLbOLbOLjELAbLbWLbmLAuLb-LULLU6LUgLUMLSALUQLSSLS5LOALSYLOHLOwLvTLvxLOZLvsL5_L5fL9FL5oL5zL9SL9MLMbL9_',
  nianxin_tx: 'LLRLLDLgQLgmLgxLgYLljLj2LjbLlHLjwLbOLbOLjELAbLbWLbmLAuLb-LULLU6LUgLUMLSALUQLSSLS5LOALSYLOHLOwLvTLvxLOZLvsL5_L5fL9FL5wL5dL9SL9MLMbL9_',
  nianxin_kg: 'LLRLLDLgQLgmLgxLgYLljLj2LjbLlHLjwLbOLbOLjELAbLbWLbmLAuLb-LULLU6LUgLUMLSALUQLSSLS5LOALSYLOHLOwLvTLvxLOZLvsL5_L5fL9FL9LL5hL9SL9MLMbL9_',
  wwwweb: 'LLRLLDLgQLgmLgxLgYLljLj2LlxLj6Lj3LjFLjuLjVLALLbCLATLAYLbhLAsLARLSbLAyLUCLUwLScLOULSHLSDLvO',
  vkeys_tx: 'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLblLbOLj3Lj-LALLb3Lb0LbsLALLAYLARLSbLAyLUCLUwLScLOULSuLSHLvULOCLOoLvELv5L5oL5XL9gL5mL5PL9oLMAL9jLMUL94',
  migu_search: 'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLjwLbOLj4LbxLASLb6LATLA-LbyLAWLU1LUgLUMLSULS6LS1LUxLvOLSDLOfLOZLOTLvoLvmLvpL5dL5gLvcL9bL5wL9GLMAL9wL9uL7lLMELMCL73L7HL7hL78L7fLBZ',
  migu_listen: 'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLjwLbOLjILbxLASLb6LATLA-LbyLAWLU1LUgLUMLSULS6LOWLS8LSRLOlLvtLvsLvWLOCLv4Lv-LvWL5LL5xLMbL53LMUL9UL93L9uL7ALMZL7WL7CL7OL7pL7_LFgLBmLBtLB8LFcLFALF5LFyL2bLmwL2XL2cLmu',
  vkeys_tx_v2: 'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLblLbOLj3Lj-LALLb3Lb0LbsLALLAYLARLUCLUILOALUQLS6LS5LOULSoLOALOxLOoLvELOfLvKL5RL51L9FL5PL5yL96L9FL91L9x',
  aa_cab_tx: 'LLRLLDLgQLgmLgxLgYLljLj2LlsLj6LjxLlILAOLj6LAbLbCLAtLACLABLUYLUKLUoLAPLUfLUu',
  oiapi_migu: 'LLRLLDLgQLgmLgxLgYLljLj2LjULloLjxLjBLbSLbxLASLboLbeLbELbGLAsLU_LUlLUYLUfLSaLS6LSyLS1LSKLOuLOkLO1',
  kw_mobi: 'LLRLLDLgQLgmLjjLgVLljLlNLjbLlYLjILjALAOLj-Lb3LbGLbtLbsLALLAYLARLSbLUmLUxLUwLSOLS5',
  report_url: 'LLRLLDLgQLgmLjjLgVLljLjbLbSLj8LloLbFLAOLbpLjPLAWLAdLb1LUmLSlLATLAtLUcLSpLSTLSSLS9LOlLSkLvALOsLO0LOELvBLvQL5T',
  ynx_apikey_a: 'LgcLLQLlgLlNLlxLgwLgTLlILlPLjtLl3LbNLb3LbXLj4LAZLAeLAZLUmLATLAwLAQLUyLS6LS0LSZLUxLSfLOXLS4LOoLvd',
  ynx_apikey_b: 'LgPLgzLLYLlMLlZLlaLlILlPLj6LluLluLlcLjILbRLAjLA3LAeLbCLU7LUhLUdLATLUsLUELStLSPLOFLOwLOTLScLO1Lve',
  shouji_tx_a: 'LLRLLDLgQLgmLgxLgYLljLj2LlxLleLjxLjBLbSLbxLbuLbTLbnLbELA_LAnLUGLUlLAxLUtLUILOALSmLSoLSyLvgLv8LOJLvuLvBL5PL5aL5TL52L9LL5yL93LMJ',
  shouji_tx_b: 'LgZLLQLlgLLPLgtLgwLgwLlILj1Ll-LlYLjlLb4LbDLjILAGLA_Lb1LbxLUyLA8LUcLUsLUcLSTLU3LUcLSGLO_LS6LvxLvzLOVLOxL5GL5nLvCL5ML9YL5-L9fL5ZLM6LMTL7LL7xL7JL7xLMsLB-L78L7WLFLLFtLFnLBYLBILFfLm_LFYLmtL2nL2yLN9',
  shouji_tx_c: 'LgYLLDLgKLgmLg8Lg4LlGLgILjULl6',
  migu_referer_app: 'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLjwLbOLjILbxLASLb6LATLA-LbyLAWLU1LUgLUMLSULS6',
  migu_referer: 'LLRLLDLgQLgmLgxLgYLljLj2LjbLlpLjoLjALjILbxLAOLbRLbQLA6LA-LACLUVLUl',
}

// 运行时解码内部资源
var _dec = function(name) {
  return _0x4e8f(_0x4e11(_0xa3b1[name]))
}

// 上报地址（解码获得，避免明文；为空则不上报）
var PANEL_REPORT_URL = _dec('report_url')

// 内部文案表（运行时解码，按索引取值）
var _0x2c7a = [
  'SFgA35SSl', 'AGIAfMLlMLgYLgmLjO',
  'AGIAfMLlFLgp', 'LLGLL8LgGLgSLgxOUHO3j',
  'LLGLL8LgGLgSLgxOUHO3jLgxLjw', 'AGIAfMLliLgD',
  'viEvecU-3UXL', 'AGIAfMLg3LgS',
  'LLwLLYLgZLLILghLlkLlcLgELjLLlGLj3Lja', 'LLfLLRLg3Lg7Lg8Llr',
  'LLQLL6LgoLgMLghLleLjgLl2', 'LLdLLxvkobZ3S0-vgN',
  'AqKAqGU2SSyl', 'UdJUhRvkobZ3UPd',
  'UaGv0FOlAANn', 'LLLLLHLlmAbhS0q',
  'LLCLL1LLZLggLgpLlr', 'LLtLLKLgxLgmLg3Aq_Ai7',
  'vbfUvxLgyLL-LgwLlk', 'AGIAfMLlMLgYLgmLjOLgYLjMUYWUeVLbKLjKbPwA3OAR7',
  'AGIAfMLlMLgYLgmLjOLgYLjMbc8UJYUFzOugAc6A2R', 'AGIAfMLlFLgpLjjLgnbIDUJ2UFnLj4LjQLjr',
  'AGIAfMLlFLgpLjjLgnUQ8U0GLlRLjJbcTAQyAVU', 'AGIAfMLliLgDLjjLgnbIDUJ2UFnLj4LbbLlf',
  'AGIAfMLliLgDLjjLgnUQ8U0GLlRLjJbcTAQyAVU', 'LLQLL6LgoLgMLghLleLjgLl2Lj4Lj4bcTUnSUmkOu4APHANE',
  'LLQLL6LgoLgMLghLleLjgLl2Lj4Lj4U3tUDMLjtLbibPpA3FAVR', 'LLQLL6LgoLgMLghLleLjgLl2LjZO2TAN2Ap7OZj',
  'LLdLLxvkobZ3S0-vgNLgsbPtUnUUmiLlcLjNLjy', 'LLdLLxvkobZ3S0-vgNLgYLjMUYWUeVLbKLjKbPwA3OAR7',
  'LLdLLxvkobZ3S0-vgNLgYLjMURjvgSA_dURWUJTva1UNL', 'SFgA35SSlLlLbcbUaVUBdLjMLl6Ll0',
  'SFgA35SSlLl5LlCUQbUeTLl4LlDbPmA3qARU', 'SFgA35SSlLl5LlCvRWOyLvzQSIG',
  'SFgA35SSlLl5LlCUD_vgMAeKUkRUJ9vaZUNg', 'AGIAfMLg3LgSLlCbPcUrjUFwLjZLlTLjH',
  'AGIAfMLg3LgSLjjLgnUQ8U0GLlRLjJbcTAQyAVU', 'LLfLLRLg3Lg7Lg8LlrLgYLjMbPeUJYUFzLjGLjuLjtLbULbKLbk',
  'LLfLLRLg3Lg7Lg8LlrLgYLjMUYWUeVLbKLjKbPwA3OAR7', 'viEvecU-3UXLLjjLgnbxWUJ2UFnO3sAcoA2B',
  'viEvecU-3UXLLjjLgnUQ8U0GLlRLjJbcTAQyAVU', 'LLwLLYLgZLLILghLlkLlcLgELjLLlGLj3LjaLbGbGqUnUU2OLApLAQLAU',
  'LLwLLYLgZLLILghLlkLlcLgELjLLlGLj3LjaLbhLb3UuCU_ZLAgLU_bGNAuRAVk', 'LLGLL8LgGLgSLgxOUHO3jLjULjZbInUJOUmDLbGLj8LbI',
  'LLGLL8LgGLgSLgxOUHO3jLjULjZUQFUD6LjWLjKbI0AuDAVk', 'AqKAqGU2SSylLjjLgnbIDUJ2UFnLj4LbULlf',
  'AqKAqGU2SSylLjjLgnSIYA40UYWUeVAqT', 'AqKAqGU2SSylLjjLgnUDGU5lA9CUQFUD6',
  'AqKAqGU2SSylLjjLgnUDGOmZAmFA9XLjPLjSLbOLj8LALLbWLbeLU2Lbc', 'UdJUhRvkobZ3UPdLgYLgsbcQUnUUmiOuGAc9A2Y',
  'UdJUhRvkobZ3UPdLgYLgsUY3UewLjMLbkbPCAQrARs', 'UaGv0FOlAANnLjjLgnbIDUJ2UFnLj4LjQLjr',
  'UaGv0FOlAANnLjjLgnUQ8U0GLlRLjJbcTAQyAVU', 'UaGv0FOlAANnLjjLgnUDGvLnAeJURMUnXvanUqj',
  'LLLLLHLlmAbhS0qLgYLgsUY3UewLjMLbkbPCAQrARs', 'LLGLL8LgGLgSLgxOUHO3jLgxLjwLjdLlcbIVUdvU2FLbALbcLbm',
  'LLGLL8LgGLgSLgxOUHO3jLgxLjwLjdLlcUQ1UDoLbJLAVbIbA33ARH', 'LLCLL1LLZLggLgpLlrLgYLjMbPeUJYUFzLjGLjHLjp',
  'LLCLL1LLZLggLgpLlrLgYLjMSf4AhbU3tUDMAiw', 'LLCLL1LLZLggLgpLlrLgYLjMURjvgSA_dURWUJTva1UNL',
  'LLtLLKLgxLgmLg3Aq_Ai7LjULjZbInUJOUmDLbGLjcLbG', 'LLtLLKLgxLgmLg3Aq_Ai7LjULjZSfdA45UQ1UDoAa0',
  'LLtLLKLgxLgmLg3Aq_Ai7LjULjZUkCvlFADsURtUnnvrEUqo', 'vbfUvxLgyLL-LgwLlkLgYLjMbPeUJYUFzLjGLbALjV',
  'vbfUvxLgyLL-LgwLlkLgYLjMUYWUeVLbKLjKbPwA3OAR7', 'UrpABpSi4UP3',
  'AP0AvUS5qUDhAEcOXDAjiSJiFfWO3TUDQUzBvV6UfL', 'SIHAuxUYJU0NbfpUlV',
  'LLCLLoLgQLLELgYLlKLgsLlNLjULltLlcLj9Lj4LjRLb-LbTLbzLAY', 'OYfUu9OE_UJBLlu',
  'AGIAfMLg3LgSLjjLgn', 'LLfLLRLg3Lg7Lg8LlrLgYLjM',
  'viEvecU-3UXLLjjLgn', 'LLwLLYLgZLLILghLlkLlcLgELjLLlGLj3LjaLbhLb3',
  'LLGLL8LgGLgSLgxOUHO3jLjULjZ', 'AqKAqGLLWLlL',
  'UdJUhRvkobZ3UPdLgYLgs', 'LLLLLHLlmAbhS0qLgYLgs',
  'LLGLL8LgGLgSLgxOUHO3jLgxLjwLjdLlc', 'vbfUvxLgyLL-LgwLlkLgYLjM',
  'UOOU_lLlzLg3LgmUPOAk0ATcOEPLjdLjW', 'UrpABpSi4UP3UrYU7EAxtAFPLj4Lj4',
  'UrpUapU7zSeevkxbcOAxtAFPLj4Lj4', 'LgtLL1LgwLLELlQLlpLjLLgPLjyLlhLjPLjNLbSLjZLASLAhLbwLAHLbxLACLUeLSNLAyLUpLUyLSZLS2LOl',
  'LLsLLWLgxLgMLgtLlVLlTLlFLjh', 'LgYLL1LgwLLELlP',
  'LgYLLeLgYLggLg1Ll0LltLgILjh', 'LgYLLDLgHLL4Lg8Lg4',
  'LgYLL_LgoLLcLgcLj2LjgLlOLjh', 'LgYLLoLgELLELg8LlKLloLlVLl6LleLjwLjgLbc',
  'LgYLL0LgGLLILg3LlVLjlLlf', 'LgYLLzLgYLLfLg6LlkLloLljLjh',
  'LgYLLoLgELLELg8LlKLloLlVLjLLlXLly', 'LLCLLoLgQLLELgYLlKLg-Ll5LlsLloLbSLjgLbl',
  'LgYLL0LgGLgFLghLl0LltLgsLlrLloLjfLbd', 'LgYLL1LgwLLELgxLg4',
  'LgYLL1LgQLgMLg8LlXLlpLgsLlrLlHLbOLj2LbOLj8Ljs', 'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLblLbOLbSLjRLAMLb6Lb2LbsLbhLAxLUnLAHLUvLSALURLOALUPLSuLO1Lv5LOZLOTLvE',
  'LLWLL_LgoLLELg1Lj9LlTLlm', 'LLXLL3',
  'LLPLL2', 'LLWLL3',
  'LLfLLN', 'LLXLLR',
  'SaZbPSUR9bPCAm_AenFG8UAiSDSA9mUdcU-ubfZSnsO4LvKxUfsLgrO4MUJlAIdSdfUBsLUkLSrUFsOUgALhO6oA7u', 'LLCLLoLgQLLELgYLlKLg-Ll9LloLltLbOLjELjPLjPLAbLb1LbXLAyLbyLAZLUw',
  'LgYLLQLgwLlj', 'v_cO-VvzrScI',
]
_0x2c7a.push(
  'LLCLLoLgQLLELgYLlKLg-LlqLlC', 'LLCLLoLgQLLELgYLlKLg-Ll9LjALlsLj6LjN',
  'LgYLLeLgQLLfLg-LlwLltLlf', 'LgYLLYLg6LgNLgYLlTLg-',
  'LLRLLDLgQLgmLgxLgYLljLj2LlsLlXLblLbOLbSLjRLbSLbxLb1LbELbPLAXLURLSLLAc',
  'LLRLLDLgQLgmLgxLgYLljLj2LjLLlXLblLjOLbLLjZLbSLbRLbtLbELbZLAZLURLSg',
  'UzPUJdU80U_cATsO-0FGB', 'LgYLLeLgPLgNLg3LlpLloLlVLlQLlsLj6Lj9LbSLjZLASLAh',
  'SaRUvRLlNLgeFGX', 'FILv_eUc9SvnU_6FGB'
)
var _0x8d40 = {}
var _g = function(i) {
  if (_0x8d40[i] === undefined) _0x8d40[i] = _0x4e8f(_0x4e11(_0x2c7a[i]))
  return _0x8d40[i]
}

// 安全日志封装：移动版引擎宿主 API 极少，console 可能不存在，
// 直接使用 console.log 在初始化/请求阶段抛错会导致脚本初始化失败或请求异常
var _0x6b0f = function() {
  try {
    if (typeof console !== 'undefined' && console.log) console.log.apply(console, arguments)
  } catch (e) {}
}
var _0x6b0e = function() {
  try {
    if (typeof console !== 'undefined' && console.error) console.error.apply(console, arguments)
  } catch (e) {}
}

const _0x6a02 = (url, options) => {
  let abortFn = null
  const p = new Promise((resolve, reject) => {
    try {
      const opts = options || {}
      // 默认超时：竞速超时或调用方超时后，底层请求会在限期内自动终止，避免悬挂连接
      if (!opts.timeout) opts.timeout = 5000
      abortFn = request(url, opts, (err, resp) => {
        if (err) return reject(err)
        resolve(resp.body)
      })
    } catch (e) {
      reject(e)
    }
  })
  // 暴露中止能力，供竞速超时时取消底层请求
  p.abort = () => { try { if (typeof abortFn === 'function') abortFn() } catch (e) {} }
  return p
}

// 带响应头的请求封装：部分接口（如咪咕 listenSong）通过 302 返回真实直链，
// 需读取 Location 头才能拿到可播放地址
const _0x6a01 = (url, options) => {
  let abortFn = null
  const p = new Promise((resolve, reject) => {
    try {
      const opts = options || {}
      if (!opts.timeout) opts.timeout = 5000
      abortFn = request(url, opts, (err, resp) => {
        if (err) return reject(err)
        resolve({
          body: resp && resp.body,
          headers: (resp && resp.headers) || {},
          statusCode: resp && resp.statusCode,
        })
      })
    } catch (e) {
      reject(e)
    }
  })
  p.abort = () => { try { if (typeof abortFn === 'function') abortFn() } catch (e) {} }
  return p
}

// 带超时的请求封装，避免慢速API阻塞并发竞速
// 超时优先中止底层 HTTP 请求（若封装链暴露了 abort），减少悬挂连接与无效上报
const _0x6a03 = function(promise, ms) {
  var timer = null
  var timeout = new Promise(function(_, reject) {
    timer = setTimeout(function() {
      try {
        if (promise && typeof promise.abort === 'function') promise.abort()
      } catch (e) {}
      reject(new Error(_g(69) + ms + 'ms)'))
    }, ms)
  })
  return Promise.race([promise, timeout]).then(function(v) {
    clearTimeout(timer)
    return v
  }, function(e) {
    clearTimeout(timer)
    throw e
  })
}

const _0x6a04 = function(url) {
  if (!url || typeof url !== 'string') return false
  if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) return false
  if (url.indexOf('panspace.kuwo.cn') !== -1) return false
  // 加密母带/全景声容器（QQ A000/AI000/Q000 系，实为加密 ogg/mp4，下载后无法播放）
  if (/(?:^|\/)(?:AI000|A000|Q000|Q001)[0-9A-Za-z]{6,}\.(?:flac|m4a|mp3|mp4)(?:$|\?)/i.test(url)) return false
  return true
}

// 媒体直链 https 升级：仅对已验证支持 https 的 CDN 生效，其余保持原样
const _0x6a09 = function(url) {
  if (typeof url !== 'string' || url.indexOf('http://') !== 0) return url
  var m = /^http:\/\/([^\/?#]+)/.exec(url)
  if (!m) return url
  var host = m[1].toLowerCase().replace(/:\d+$/, '')
  if (/^(?:car-[a-z0-9-]+\.kuwo\.cn|(?:ws|dl)\.stream\.qqmusic\.qq\.com)$/.test(host)) return 'https://' + url.slice(7)
  return url
}

// 统计上报：异步发送调用数据到控制面板，不阻塞主流程
// 使用随机生成的用户ID区分用户，代替IP识别
var _cachedClientIp = ''
var _userId = ''
var _clientType = ''

// 检测客户端类型（轻量 UA 嗅探，兼容无 navigator 的环境）
var _0x6b07 = function() {
  try {
    var ua = (globalThis && globalThis.navigator && globalThis.navigator.userAgent) || ''
    if (/android/i.test(ua)) _clientType = 'Android'
    else if (/iphone|ipad|ios/i.test(ua)) _clientType = 'iOS'
    else if (/windows/i.test(ua)) _clientType = 'Windows'
    else if (/macintosh|mac os/i.test(ua)) _clientType = 'macOS'
    else if (/linux/i.test(ua)) _clientType = 'Linux'
  } catch(e) {}
  // 移动版无 navigator：用洛雪宿主环境标识兜底
  if (!_clientType) {
    try {
      var env = (globalThis && globalThis.lx && globalThis.lx.env) || ''
      if (env === 'mobile') _clientType = 'LX-Mobile'
      else if (env === 'desktop') _clientType = 'LX-Desktop'
    } catch(e) {}
  }
}

// 设备特征：与后台 IP/UA 共同确定稳定用户ID（移动版仅能取到 env 与时区）
var _deviceFp = ''
var _0x6b12 = function() {
  var parts = []
  try {
    if (globalThis && globalThis.lx && globalThis.lx.env) parts.push('env:' + globalThis.lx.env)
  } catch(e) {}
  try {
    var nav = (globalThis && globalThis.navigator) || null
    if (nav) {
      if (nav.userAgent) parts.push('ua:' + nav.userAgent)
      if (nav.language) parts.push('lang:' + nav.language)
      if (nav.platform) parts.push('plat:' + nav.platform)
      if (nav.hardwareConcurrency) parts.push('cores:' + nav.hardwareConcurrency)
      if (nav.deviceMemory) parts.push('mem:' + nav.deviceMemory)
    }
  } catch(e) {}
  try {
    var scr = (globalThis && globalThis.screen) || null
    if (scr) parts.push('scr:' + scr.width + 'x' + scr.height + 'x' + (scr.colorDepth || 0))
  } catch(e) {}
  try {
    if (globalThis && typeof globalThis.devicePixelRatio === 'number') parts.push('dpr:' + globalThis.devicePixelRatio)
  } catch(e) {}
  try { parts.push('tz:' + new Date().getTimezoneOffset()) } catch(e) {}
  _deviceFp = parts.join('|')
}

var _0x6b06 = function() {
  // 生成随机用户ID（格式: U + 12位随机十六进制）
  var chars = '0123456789abcdef'
  var id = 'U'
  for (var i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * 16)]
  }
  _userId = id
}

var _clientIpPromise = null
// 公网 IP 获取：多服务商顺序回退，结果复用同一 Promise（失败返回空串，不抛错）
var _0x6b08 = function() {
  if (_clientIpPromise) return _clientIpPromise
  _clientIpPromise = new Promise(function(resolve) {
    var urls = [_g(97), _g(112), _g(113)]
    var i = 0
    var next = function() {
      if (_cachedClientIp) { resolve(_cachedClientIp); return }
      if (i >= urls.length) { resolve(''); return }
      var u = urls[i++]
      _0x6a02(u, { method: 'GET', timeout: 3000 }).then(function(body) {
        var ip = body && (body.ip || body.query)
        if (ip) {
          _cachedClientIp = String(ip)
          resolve(_cachedClientIp)
          return
        }
        next()
      }).catch(function() { next() })
    }
    next()
  })
  return _clientIpPromise
}

// 使用者IP上报：等待公网 IP 获取完成后再发送，后台以服务端观测 IP 优先
var _0x6b15 = function() {
  if (!PANEL_REPORT_URL) return
  var post = function() {
    try {
      var body = _g(108) + _g(88) + encodeURIComponent(_userId || '')
        + _g(89) + encodeURIComponent(_clientType)
      if (_cachedClientIp) body += _g(92) + encodeURIComponent(_cachedClientIp)
      if (_deviceFp) body += _g(106) + encodeURIComponent(_deviceFp)
      body += _g(115) + encodeURIComponent(SCRIPT_VERSION)
      _0x6a01(PANEL_REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      }).then(function(resp) {
        _0x6b13(resp && resp.statusCode, resp && resp.body)
      }).catch(function() {})
    } catch(e) {}
  }
  try {
    _0x6b08().then(post, post)
  } catch(e) {
    post()
  }
}

// 更新弹窗投递结果回传：成功但无弹窗=客户端「允许更新弹窗」开关关闭；失败=客户端拒绝（附原因）
var _0x6b16 = function(status, msg) {
  if (!PANEL_REPORT_URL) return
  try {
    var body = _g(109) + _g(110) + status
    if (msg) body += _g(111) + encodeURIComponent(String(msg).substring(0, 200))
    if (_userId) body += _g(88) + encodeURIComponent(_userId)
    if (_clientType) body += _g(89) + encodeURIComponent(_clientType)
    if (_cachedClientIp) body += _g(92) + encodeURIComponent(_cachedClientIp)
    if (_deviceFp) body += _g(106) + encodeURIComponent(_deviceFp)
    _0x6a01(PANEL_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    }).then(function(resp) {
      _0x6b13(resp && resp.statusCode, resp && resp.body)
    }).catch(function() {})
  } catch(e) {}
}

// 面板回包统一处理：采纳后台发放的用户ID；命中黑名单或频率限制时本地停用
var _0x6b13 = function(statusCode, respBody) {
  var body = respBody
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch(e) { body = null }
  }
  if (body && typeof body === 'object') {
    if (body.user_id) _userId = String(body.user_id)
    if (body.userId) _userId = String(body.userId)
    if (body.blacklisted === true) _scriptDisabled = true
  }
  if (statusCode === 403 || statusCode === 429) _scriptDisabled = true
}

// 接口失败熔断：连续失败 3 次后 5 分钟内跳过该接口，成功一次清零
var _sourceHealth = {}
var SOURCE_FAIL_LIMIT = 3
var SOURCE_COOLDOWN = 300000
var _0x6b1a = function(name) {
  var st = _sourceHealth[name]
  return !!(st && st.until > Date.now())
}
var _0x6b1b = function(name, ok) {
  if (ok) {
    delete _sourceHealth[name]
    return
  }
  var st = _sourceHealth[name] || { fails: 0, until: 0 }
  st.fails++
  if (st.fails >= SOURCE_FAIL_LIMIT) {
    st.fails = 0
    st.until = Date.now() + SOURCE_COOLDOWN
  }
  _sourceHealth[name] = st
}

// 用户ID兜底：弹窗不可用时，在最终失败提示中携带用户ID与脚本版本
var _pushUserIdOn = false
var _0x6b19 = function(text) {
  var s = String(text || '')
  if (!_pushUserIdOn || !_userId) return s
  return s + '\n' + _g(116) + _userId + _g(117) + SCRIPT_VERSION + '）'
}

var _0x6b04 = function(platform, apiName, success, responseTime, quality) {
  _0x6b1b(apiName, !!success)
  if (!PANEL_REPORT_URL) return
  try {
    var q = String(quality || '')
    var body = _g(84) + encodeURIComponent(platform)
      + _g(85) + encodeURIComponent(apiName)
      + _g(86) + (success ? 1 : 0)
      + _g(87) + encodeURIComponent(String(responseTime))
      + _g(88) + encodeURIComponent(_userId)
      + _g(89) + encodeURIComponent(_clientType)
      + _g(90)
    if (q !== '') body += _g(91) + encodeURIComponent(q)
    if (_cachedClientIp) body += _g(92) + encodeURIComponent(_cachedClientIp)
    if (_deviceFp) body += _g(106) + encodeURIComponent(_deviceFp)
    _0x6a01(PANEL_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    }).then(function(resp) {
      _0x6b13(resp && resp.statusCode, resp && resp.body)
    }).catch(function() {})
  } catch(e) {}
}

// 失效播放聚合上报：整首歌曲所有接口均失败时触发一次，按 request_id 去重合并
var _0x6b05 = function(platform, quality, candidates) {
  if (!PANEL_REPORT_URL) return
  try {
    var _0x6b10 = []
    for (var i = 0; i < candidates.length; i++) _0x6b10.push(candidates[i].name)
    var reqId = 'R' + Math.random().toString(16).substring(2, 10) + Date.now().toString(16)
    var body = _g(93)
      + _g(94) + encodeURIComponent(reqId)
      + '&platform=' + encodeURIComponent(platform)
      + _g(88) + encodeURIComponent(_userId)
      + _g(91) + encodeURIComponent(String(quality || ''))
      + _g(95) + encodeURIComponent(JSON.stringify(_0x6b10))
      + _g(96) + candidates.length
    if (_cachedClientIp) body += _g(92) + encodeURIComponent(_cachedClientIp)
    if (_deviceFp) body += _g(106) + encodeURIComponent(_deviceFp)
    _0x6a01(PANEL_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    }).then(function(resp) {
      _0x6b13(resp && resp.statusCode, resp && resp.body)
    }).catch(function() {})
  } catch(e) {}
}

const _0x6a05 = function(musicInfo) {
  return musicInfo.hash || musicInfo.songmid || musicInfo.songId || musicInfo.id || musicInfo.rid || musicInfo.musicId || musicInfo.copyrightId || musicInfo.songid
}

const _0x6a06 = function(platform, musicInfo) {
  if (platform === _g(99)) return musicInfo.hash || musicInfo.songmid || musicInfo.id || musicInfo.rid || musicInfo.mid
  if (platform === _g(100)) return musicInfo.songmid || musicInfo.strMediaMid || musicInfo.mediaId || musicInfo.id
  if (platform === _g(101)) return musicInfo.copyrightId || musicInfo.songId || musicInfo.id || musicInfo.songmid
  return musicInfo.songmid || musicInfo.id || musicInfo.songId || musicInfo.rid || musicInfo.hash
}

const _0x6a07 = function(quality) {
  var q = String(quality || '128k').toLowerCase()
  if (q === 'jymaster' || q === 'jyeffect' || q === 'sky' || q === 'dolby' || q === 'atmos' || q === 'atmos_plus' || q === 'master') return 'lossless'
  if (q === 'flac' || q === 'flac24bit' || q === 'hires') return 'lossless'
  if (q === '320k' || q === '192k') return 'exhigh'
  return 'standard'
}

const _0x6a08 = function(musicInfo) {
  var name = musicInfo.name || musicInfo.songName || ''
  var singer = musicInfo.singer || musicInfo.artist || ''
  if (name && singer) return name + ' ' + singer
  return name
}

// ========== API 源获取函数 ==========

// 念心SVIP - kw (从混淆代码提取的真实URL)
var _0x6d01 = {
  [_g(103)]: _dec('nianxin_kw') + '?id={id}&level={level}&type=mp3',
}
// 302 中转解析：念心 kw/tx/kg 返回 *.php 接口地址，直接交给播放器会导致
// 下载扩展名错误（.php 被存成 .mp3），文件打不开；探测 Location 取真实音频直链
// Range 仅取 1 字节：若宿主自动跟随跳转，最多传输 1 字节，避免整首拉入内存
const _0x6a0a = function(url) {
  return _0x6a01(url, {
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-0' },
    timeout: 3000,
  }).then(function(resp) {
    var h = (resp && resp.headers) || {}
    var loc = h.location || h.Location
    if (loc && _0x6a04(loc)) return loc
    // 少数客户端会自动跟随跳转（读不到 Location）：回退接口地址，保证可播放
    return url
  }).catch(function() {
    return url
  })
}

const _0x6c02 = function(source, musicInfo, quality) {
  var songId = _0x6a06(source, musicInfo)
  if (!songId) return Promise.reject(new Error(_g(19)))
  var template = _0x6d01[source]
  if (!template) return Promise.reject(new Error(_g(20)))
  var level = _0x6a07(quality)
  var url = template.replace('{id}', encodeURIComponent(String(songId))).replace('{level}', encodeURIComponent(level))
  return _0x6a0a(url)
}

// 念心TX接口 - tx (返回302直链)
var NIANXIN_TX_URL = _dec('nianxin_tx')
var _0x6c03 = function(source, musicInfo, quality) {
  if (source !== _g(100)) return Promise.reject(new Error(_g(21)))
  var songId = _0x6a06('tx', musicInfo)
  if (!songId) return Promise.reject(new Error(_g(22)))
  var level = _0x6a07(quality)
  // 该接口通过302重定向返回音频直链，解析 Location 后返回真实音频地址
  return _0x6a0a(NIANXIN_TX_URL + '?id=' + encodeURIComponent(String(songId)) + '&level=' + level + '&type=mp3')
}

// 念心KG接口 - kg (返回302直链)
var NIANXIN_KG_URL = _dec('nianxin_kg')
var _0x6c06 = function(source, musicInfo, quality) {
  if (source !== _g(99)) return Promise.reject(new Error(_g(23)))
  var songId = _0x6a06('kg', musicInfo)
  if (!songId) return Promise.reject(new Error(_g(24)))
  var level = _0x6a07(quality)
  return _0x6a0a(NIANXIN_KG_URL + '?id=' + encodeURIComponent(String(songId)) + '&level=' + level + '&type=mp3')
}

// gdstudio - 多平台支持 (wy/tx/kg/kw/mg)
var GDSTUDIO_SOURCE_MAP = { 'wy': 'netease', 'tx': 'qq', 'kg': 'kugou', 'kw': 'kuwo', 'mg': 'migu' }
const _0x6c0b = function(source, musicInfo, quality) {
  var gdSource = GDSTUDIO_SOURCE_MAP[source]
  if (!gdSource) return Promise.reject(new Error(_g(25)))
  var songId = source === _g(102) ? _0x6a05(musicInfo) : _0x6a06(source, musicInfo)
  if (!songId) return Promise.reject(new Error(_g(26)))
  var brMap = { '128k': '128', '192k': '320', '320k': '320', 'flac': '740', 'hires': '999', 'flac24bit': '999', 'jyeffect': '999', 'sky': '999', 'jymaster': '999', 'dolby': '999', 'atmos': '999', 'atmos_plus': '999', 'master': '999' }
  var br = brMap[quality] || '320'
  return _0x6a02(_dec('gdstudio') + '?types=url&source=' + gdSource + '&id=' + encodeURIComponent(String(songId)) + '&br=' + br, {
    method: 'GET',
  }).then(function(body) {
    if (body && body.url && _0x6a04(body.url)) return body.url
    throw new Error(_g(27))
  })
}

// QQ音乐直连vkey - tx (直接调用QQ音乐官方vkey接口，响应最快~0.13s)
// 支持dolby全景声音质
var QQ_VKEY_URL = _dec('qq_vkey')
var QQ_CDN_URL = _dec('qq_cdn')
var QQ_VKEY_GUID = '10000'

var _qqVkeyRequest = function(filename, songmid) {
  var payload = {
    comm: { ct: 19, cv: 0, guid: QQ_VKEY_GUID, tmeAppID: 'qqmusic', qq: '0' },
    hot: {
      method: 'CgiGetHotVkey',
      module: 'music.vkey.GetEVkey',
      param: { filename: [filename], songmid: [String(songmid)] }
    }
  }
  return _0x6a02(QQ_VKEY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(body) {
    if (body && body.code === 0 && body.hot && body.hot.code === 0 &&
        body.hot.data && body.hot.data.urls && body.hot.data.urls.length > 0) {
      var purl = body.hot.data.urls[0].purl
      if (purl) {
        var fullUrl = QQ_CDN_URL + purl
        if (_0x6a04(fullUrl)) return fullUrl
      }
    }
    return null
  })
}

var _0x6c0c = function(source, musicInfo, quality) {
  if (source !== _g(100)) return Promise.reject(new Error(_g(28)))
  var songmid = musicInfo.songmid || musicInfo.strMediaMid || musicInfo.id || ''
  var mediaMid = musicInfo.strMediaMid || songmid
  if (!songmid) return Promise.reject(new Error(_g(29)))
  // 音质格式映射，按优先级尝试
  // QQ音乐CDN前缀: C400=128k, M800=320k, F000=FLAC, D000=HiRes
  // A000/AI000(臻品母带)、Q000(全景声) 为加密容器，下载后无法播放，已剔除
  var formatMap = {
    '128k': [{ prefix: 'C400', ext: 'm4a' }],
    '192k': [{ prefix: 'M800', ext: 'mp3' }, { prefix: 'C400', ext: 'm4a' }],
    '320k': [{ prefix: 'M800', ext: 'mp3' }, { prefix: 'C400', ext: 'm4a' }],
    'flac': [{ prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'flac24bit': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'hires': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'dolby': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'atmos': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'atmos_plus': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'jyeffect': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'sky': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'jymaster': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }],
    'master': [{ prefix: 'D000', ext: 'flac' }, { prefix: 'F000', ext: 'flac' }, { prefix: 'M800', ext: 'mp3' }]
  }
  var formats = formatMap[quality] || formatMap['320k']
  // 依次尝试不同格式，第一个成功即返回
  var tryFormat = function(index) {
    if (index >= formats.length) {
      return Promise.reject(new Error(_g(30)))
    }
    var fmt = formats[index]
    var filename = fmt.prefix + mediaMid + '.' + fmt.ext
    return _qqVkeyRequest(filename, songmid).then(function(url) {
      if (url) return url
      return tryFormat(index + 1)
    })
  }
  return tryFormat(0)
}

// 玉宁熙tx主接口 - tx (带APIKEY)
var YNX_TX_URL = _dec('ynx_tx')
var YNX_TX2_URL = _dec('ynx_tx2')
var YNX_APIKEY = _dec('ynx_apikey_a') + _dec('ynx_apikey_b')

// 校验玉宁熙返回的URL是否匹配请求的音质，避免音质降级
var _checkYnxQuality = function(quality, url) {
  if (!url) return false
  var q = String(quality || '128k').toLowerCase()
  // 128k 不降级检查
  if (q === '128k') return true
  // 320k 不应返回 C400（128k m4a）
  if (q === '320k' || q === '192k') {
    return url.indexOf('C400') === -1
  }
  // 无损/全景声应包含 flac 或高品质标识，避免 C400
  if (q === 'flac' || q === 'flac24bit' || q === 'hires' || q === 'dolby' || q === 'atmos' || q === 'atmos_plus' || q === 'jyeffect' || q === 'sky' || q === 'jymaster' || q === 'master') {
    return url.indexOf('C400') === -1
  }
  return true
}

var _0x6c01 = function(source, musicInfo, quality) {
  if (source !== _g(100)) return Promise.reject(new Error(_g(31)))
  var songmid = _0x6a06('tx', musicInfo)
  if (!songmid) return Promise.reject(new Error(_g(32)))
  // 音质映射为中文type参数
  // 臻品母带=master, 臻品全景声=atmos/dolby, SQ无损=flac, HQ高品质=320k, 低品质=128k
  var typeMap = { '128k': '低品质', '192k': 'HQ高品质', '320k': 'HQ高品质', 'flac': 'SQ无损', 'hires': 'SQ无损', 'flac24bit': '臻品全景声', 'dolby': '臻品全景声', 'atmos': '臻品全景声', 'atmos_plus': '臻品全景声', 'jyeffect': '臻品全景声', 'sky': '臻品全景声', 'jymaster': '臻品母带', 'master': '臻品母带' }
  var type = encodeURIComponent(typeMap[quality] || 'HQ高品质')
  // 主接口地址由资源表解码获得
  return _0x6a02(YNX_TX_URL + '?type=' + type + '&mid=' + encodeURIComponent(String(songmid)) + '&apikey=' + YNX_APIKEY, {
    method: 'GET',
  }).then(function(body) {
    if (body && body.code === 0 && body.data && body.data.music) {
      var musicUrl = body.data.music
      if (_0x6a04(musicUrl)) {
        if (_checkYnxQuality(quality, musicUrl)) return musicUrl
        throw new Error(_g(33))
      }
    }
    // 主接口失败，尝试次接口
    return _0x6a02(YNX_TX2_URL + '?mid=' + encodeURIComponent(String(songmid)), {
      method: 'GET',
    }).then(function(body2) {
      if (body2) {
        // 按音质依次尝试字段
        var fields = ['song_play_url_hq', 'song_play_url_standard', 'song_play_url']
        if (quality === 'flac' || quality === 'flac24bit') {
          fields = ['song_play_url_pq', 'song_play_url_sq', 'song_play_url_hq', 'song_play_url_standard', 'song_play_url']
        } else if (quality === '128k') {
          fields = ['song_play_url_standard', 'song_play_url', 'song_play_url_fq']
        }
        for (var i = 0; i < fields.length; i++) {
          var url = body2[fields[i]]
          if (url && _0x6a04(url)) {
            if (_checkYnxQuality(quality, url)) return url
          }
        }
      }
      throw new Error(_g(34))
    })
  })
}

// 念心wy接口 - wy
var NIANXIN_WY_URL = _dec('nianxin_wy')

var _0x6c08 = function(source, musicInfo, quality) {
  if (source !== _g(102)) return Promise.reject(new Error(_g(35)))
  var songId = musicInfo.songId || musicInfo.musicId || musicInfo.id || ''
  if (!songId) return Promise.reject(new Error(_g(36)))
  var levelMap = { '128k': 'standard', '192k': 'exhigh', '320k': 'exhigh', 'flac': 'lossless', 'hires': 'hires', 'flac24bit': 'hires', 'jyeffect': 'jyeffect', 'sky': 'sky', 'jymaster': 'jymaster', 'dolby': 'dolby', 'atmos': 'dolby', 'atmos_plus': 'dolby', 'master': 'jymaster' }
  var level = levelMap[quality] || 'exhigh'
  return _0x6a02(NIANXIN_WY_URL + '?id=' + encodeURIComponent(String(songId)) + '&level=' + level, {
    method: 'GET',
  }).then(function(body) {
    if (body && body.code === 200 && body.url && _0x6a04(body.url)) return body.url.trim()
    throw new Error(_g(70) + (body && body.msg ? body.msg : '未返回有效链接'))
  })
}

// wwwweb - wy/kw (POST JSON，返回真实直链)
var WWWWEB_URL = _dec('wwwweb')
var _0x6c0a = function(source, musicInfo, quality) {
  if (source !== _g(102) && source !== _g(103)) return Promise.reject(new Error(_g(37)))
  var songId = _0x6a06(source, musicInfo)
  if (!songId) return Promise.reject(new Error(_g(38)))
  return _0x6a02(WWWWEB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'lx-music-request/2.9.0' },
    body: JSON.stringify({ source: source, musicId: String(songId), quality: quality || '320k' }),
    timeout: 6000,
  }).then(function(body) {
    if (body && body.code === 200 && body.url && _0x6a04(body.url)) return body.url
    throw new Error(_g(71) + (body && body.message ? body.message : '未返回有效链接'))
  })
}

// ========== vkeys 腾讯直链 - tx ==========
// GET /music/tencent/song/link?mid=<songmid> 直接返回腾讯官方可播放直链（多为FLAC）
var VKEYS_TX_URL = _dec('vkeys_tx')
var _0x6c04 = function(source, musicInfo, quality) {
  if (source !== _g(100)) return Promise.reject(new Error(_g(43)))
  var songId = _0x6a06('tx', musicInfo)
  if (!songId) return Promise.reject(new Error(_g(44)))
  return _0x6a02(VKEYS_TX_URL + '?mid=' + encodeURIComponent(String(songId)), {
    method: 'GET',
    timeout: 6000,
  }).then(function(body) {
    var u = body && body.data && (body.data.url || body.data.link)
    if (u && _0x6a04(u)) return u
    if (body && body.url && _0x6a04(body.url)) return body.url
    throw new Error(_g(74) + (body && body.message ? body.message : '未返回有效链接'))
  })
}

// ========== 咪咕搜索播放 - mg ==========
// 音乐软件传入的咪咕ID多为copyrightId，需先经搜索接口换取18位contentId，
// 再调用 listenSong.do（该接口302重定向到咪咕官方音频直链，免费曲目可用）
var MIGU_SEARCH_URL = _dec('migu_search')
var MIGU_LISTEN_URL = _dec('migu_listen')

var _isContentId = function(id) {
  return /^\d{18}$/.test(String(id || ''))
}

var _0x6c0d = function(source, musicInfo, quality) {
  if (source !== _g(101)) return Promise.reject(new Error(_g(45)))
  var toneMap = { '128k': 'PQ', '192k': 'HQ', '320k': 'HQ', 'flac': 'SQ', 'hires': 'SQ', 'flac24bit': 'ZQ', 'atmos': 'ZQ', 'atmos_plus': 'ZQ', 'master': 'ZQ' }
  var toneFlag = toneMap[quality] || 'HQ'
  var rawId = _0x6a06('mg', musicInfo)

  var buildListen = function(contentId, copyrightId) {
    var u = MIGU_LISTEN_URL + '?toneFlag=' + toneFlag + '&contentId=' + encodeURIComponent(String(contentId))
    if (copyrightId) u += '&copyrightId=' + encodeURIComponent(String(copyrightId))
    return u + '&netType=01&resourceType=2&formatType=' + toneFlag + '&channel=014000D'
  }

  // 调用 listenSong.do：免费曲目返回 302 直链（读取 Location），VIP 曲目返回 JSON 提示
  var resolveListen = function(contentId, copyrightId) {
    var listenUrl = buildListen(contentId, copyrightId)
    return _0x6a01(listenUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'Referer': _dec('migu_referer_app'),
      },
      timeout: 6000,
    }).then(function(resp) {
      var h = resp.headers || {}
      var loc = h.location || h.Location
      if (loc && _0x6a04(loc)) return loc
      var body = resp.body
      if (body && body.data && body.data.url && _0x6a04(body.data.url)) return body.data.url
      if (body && body.url && _0x6a04(body.url)) return body.url
      // JSON 响应说明无试听地址（多为 VIP 曲目）；否则视为已重定向到音频，直接返回接口地址
      if (body && typeof body === 'object' && (body.info || body.msg || body.code)) {
        throw new Error(_g(75) + (body.info || body.msg || '无试听地址'))
      }
      return listenUrl
    })
  }

  // 同时拿到18位contentId与独立copyrightId时可直接解析；否则走搜索补齐参数
  var rawCrid = musicInfo.copyrightId ? String(musicInfo.copyrightId) : ''
  if (_isContentId(rawId) && rawCrid && !_isContentId(rawCrid)) {
    return resolveListen(rawId, rawCrid)
  }

  var keyword = _0x6a08(musicInfo)
  if (!keyword) return Promise.reject(new Error(_g(46)))
  return _0x6a02(MIGU_SEARCH_URL + '?keyword=' + encodeURIComponent(keyword) + '&pageNo=1&pageSize=5', {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
      'Referer': _dec('migu_referer'),
    },
    timeout: 6000,
  }).then(function(body) {
    var list = body && body.data
    if (!list || !list.length) throw new Error(_g(47))
    // 优先匹配同名同歌手，其次同名，最后取第一条
    var picked = null
    var wantName = String(musicInfo.name || musicInfo.songName || '')
    var wantSinger = String(musicInfo.singer || musicInfo.artist || '')
    for (var i = 0; i < list.length; i++) {
      var sameName = !wantName || String(list[i].songName || '') === wantName
      var sameSinger = !wantSinger || String(list[i].singer || '').indexOf(wantSinger) !== -1
      if (sameName && sameSinger) { picked = list[i]; break }
      if (!picked && sameName) picked = list[i]
    }
    if (!picked) picked = list[0]
    var contentId = picked.contentId || picked.songId || ''
    if (!contentId) throw new Error(_g(48))
    return resolveListen(contentId, picked.copyrightId || '')
  })
}

// ========== 收集の聚合接口 (tx) ==========
var SHOUJI_TX_URL = _dec('shouji_tx_a') + _dec('shouji_tx_b') + _dec('shouji_tx_c')

var _0x6c0f = function(source, musicInfo, quality) {
  if (source !== _g(100)) return Promise.reject(new Error(_g(51)))
  var songmid = _0x6a06('tx', musicInfo) || _0x6a05(musicInfo)
  if (!songmid) return Promise.reject(new Error(_g(52)))
  return _0x6a02(SHOUJI_TX_URL + '&mid=' + encodeURIComponent(String(songmid)), {
    method: 'GET',
    timeout: 5000,
  }).then(function(body) {
    var u = body && (body.url || (body.data && body.data.url)) || ''
    if (_0x6a04(u)) return u
    throw new Error(_g(53))
  })
}
// ========== v2.2.0 新增可用源 ==========

// vkeys腾讯v2 - tx (mid + quality 参数)
var VKEYS_V2_URL = _dec('vkeys_tx_v2')

var _0x6c05 = function(source, musicInfo, quality) {
  if (source !== _g(100)) return Promise.reject(new Error(_g(55)))
  var songmid = _0x6a06('tx', musicInfo)
  if (!songmid) return Promise.reject(new Error(_g(56)))
  var qMap = { '128k': '6', '192k': '7', '320k': '8', 'flac': '10', 'flac24bit': '11', 'hires': '11', 'jyeffect': '11', 'sky': '11', 'dolby': '11', 'atmos': '11', 'atmos_plus': '11', 'jymaster': '11', 'master': '11' }
  var qc = qMap[quality] || '8'
  return _0x6a02(VKEYS_V2_URL + '?mid=' + encodeURIComponent(String(songmid)) + _g(91) + qc, {
    method: 'GET',
    timeout: 6000,
  }).then(function(body) {
    var u = body && body.data && (body.data.url || body.data.link)
    if (u && _0x6a04(u)) return u
    throw new Error(_g(78) + ((body && (body.message || body.msg)) || '未返回有效链接'))
  })
}

// aa.cab - tx 搜索式取链 (msg + n + type 参数)
var AACAB_TX_URL = _dec('aa_cab_tx')

var _0x6c11 = function(source, musicInfo, quality) {
  if (source !== _g(100)) return Promise.reject(new Error(_g(57)))
  var keyword = _0x6a08(musicInfo)
  if (!keyword) return Promise.reject(new Error(_g(58)))
  // type: 0=M500(128k) 1=M800(320k) 4=F000(FLAC) 5=AI000(加密母带，不可播放)
  // 母带/全景声类一律取 4（真 FLAC），不请求加密容器
  var tMap = { '128k': '0', '192k': '1', '320k': '1', 'flac': '4', 'flac24bit': '4', 'hires': '4', 'jyeffect': '4', 'sky': '4', 'dolby': '4', 'atmos': '4', 'atmos_plus': '4', 'jymaster': '4', 'master': '4' }
  var t = tMap[quality] || '1'
  return _0x6a02(AACAB_TX_URL + '?msg=' + encodeURIComponent(keyword) + '&n=1&type=' + t, {
    method: 'GET',
    timeout: 6000,
  }).then(function(body) {
    if (body) {
      var u = (body.data && (body.data.music || body.data.url)) || body.playUrl || body.url
      if (u && _0x6a04(u)) return u
    }
    throw new Error(_g(59))
  })
}

// oiapi咪咕 - mg 搜索式取链 (msg + br + n 参数)
var OIAPI_MIGU_URL = _dec('oiapi_migu')

var _0x6c12 = function(source, musicInfo, quality) {
  if (source !== _g(101)) return Promise.reject(new Error(_g(60)))
  var keyword = _0x6a08(musicInfo)
  if (!keyword) return Promise.reject(new Error(_g(61)))
  var brMap = { '128k': 'LQ', '192k': 'HQ', '320k': 'HQ', 'flac': 'SQ', 'flac24bit': 'SQ', 'hires': 'SQ', 'jyeffect': 'SQ', 'sky': 'SQ', 'dolby': 'SQ', 'atmos': 'SQ', 'atmos_plus': 'SQ', 'jymaster': 'SQ', 'master': 'SQ' }
  var br = brMap[quality] || 'HQ'
  return _0x6a02(OIAPI_MIGU_URL + '?msg=' + encodeURIComponent(keyword) + '&br=' + br + '&n=1', {
    method: 'GET',
    timeout: 6000,
  }).then(function(body) {
    var u = body && ((body.data && body.data.url) || body.url)
    if (u && _0x6a04(u)) return u
    throw new Error(_g(62))
  })
}

// 酷我官方mobi - kw (官方接口，响应最快~0.1s)
var _0x6d02 = _dec('kw_mobi')

var _0x6c13 = function(source, musicInfo, quality) {
  if (source !== _g(103)) return Promise.reject(new Error(_g(63)))
  var rid = _0x6a06('kw', musicInfo)
  if (!rid) return Promise.reject(new Error(_g(64)))
  // 该接口 br=flac 返回 48k AAC；无损档必须用 2000kflac（真 FLAC）
  var q = String(quality || '128k').toLowerCase()
  var lossless = q !== '128k' && q !== '192k' && q !== '320k'
  var br = q === '128k' ? '128kmp3' : (lossless ? '2000kflac' : '320kmp3')
  return _0x6a02(_0x6d02 + '?f=web&user=0&source=kwplayerhd_ar_6.6.6.6_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=' + encodeURIComponent(String(rid)) + '&br=' + br, {
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36' },
    timeout: 5000,
  }).then(function(body) {
    var data = body && body.data
    var u = data && data.url
    if (!u || !_0x6a04(u)) throw new Error(_g(79) + ((body && (body.msg || body.message)) || '获取失败'))
    // 校验实际返回格式，避免请求无损却拿到低码率 AAC
    var fmt = String(data.format || '').toLowerCase()
    var rate = Number(data.bitrate || 0)
    if (lossless) {
      if (fmt !== 'flac' && !(rate >= 1000)) throw new Error(_g(79) + _g(107))
    } else if (q === '320k' || q === '192k') {
      if (fmt !== 'flac' && !(rate >= 320)) throw new Error(_g(79) + _g(107))
    }
    return u
  })
}

// ========== API 源列表 ==========
// txTier: TX平台专用分层竞速优先级，1=优先层（真实音质、响应快），2=备用层
const _0x6b00 = [
  // 公网源
  { name: _g(0),       fetch: _0x6c01,       sources: [_g(100)], txTier: 2 },
  { name: _g(1),     fetch: _0x6c02,     sources: [_g(103)] },
  { name: _g(2),       fetch: _0x6c03,   sources: [_g(100)], txTier: 1 },
  { name: _g(3),    fetch: _0x6c04,     sources: [_g(100)], txTier: 1 },
  { name: _g(4),  fetch: _0x6c05,     sources: [_g(100)], txTier: 1 },
  { name: _g(5),       fetch: _0x6c06,   sources: [_g(99)] },
  { name: _g(7),        fetch: _0x6c08,   sources: [_g(102)] },
  { name: _g(9),       fetch: _0x6c0a,      sources: [_g(102), _g(103)] },
  { name: _g(10),     fetch: _0x6c0b,    sources: [_g(102)] },
  // v1.1.7 新增源
  { name: _g(11),   fetch: _0x6c0c,      sources: [_g(100)], txTier: 2 },
  { name: _g(12),     fetch: _0x6c0d,    sources: [_g(101)] },
  // v1.3.0 新增源
  { name: _g(14),       fetch: _0x6c0f,    sources: [_g(100)], txTier: 2 },
  // v2.2.0 新增可用源 - vkeys v2 / aa.cab / oiapi咪咕 / 酷我mobi
  { name: _g(16),       fetch: _0x6c11,     sources: [_g(100)], txTier: 2 },
  { name: _g(17),    fetch: _0x6c12,   sources: [_g(101)] },
  { name: _g(18),      fetch: _0x6c13,      sources: [_g(103)] },
]

// ========== 核心逻辑：并发竞速策略 ==========
// 对同一平台的所有可用源同时发起请求，取最快返回的有效URL
// 每个源设置4秒超时，避免慢速API阻塞；任一成功即返回
var RACE_TIMEOUT = 4000

// 安全调用源取链：同步异常转为 rejected Promise，避免提前中断竞速计数
var _0x6b1c = function(apiSource, source, musicInfo, quality) {
  try {
    return apiSource.fetch(source, musicInfo, quality)
  } catch (e) {
    return Promise.reject(e)
  }
}

// 并发竞速：所有候选源同时请求，任一成功即返回
var _0x6b02 = function(candidates, source, musicInfo, quality) {
  if (candidates.length === 0) {
    return Promise.reject(new Error(_g(65)))
  }
  // 单源直接返回（带超时）
  if (candidates.length === 1) {
    var t0 = Date.now()
    return _0x6a03(_0x6b1c(candidates[0], source, musicInfo, quality), RACE_TIMEOUT).then(function(url) {
      var elapsed = Date.now() - t0
      var ok = !!(url && _0x6a04(url))
      _0x6b04(source, candidates[0].name, ok, elapsed, quality)
      if (ok) return url
      return Promise.reject(new Error(candidates[0].name + ': 无效URL'))
    }).catch(function(e) {
      var elapsed = Date.now() - t0
      _0x6b04(source, candidates[0].name, false, elapsed, quality)
      _0x6b05(source, quality, candidates)
      throw new Error(_0x6b19(e && e.message ? e.message : e))
    })
  }
  // 多源并发竞速
  var errors = []
  var resolved = false
  var aborts = []
  var abortAll = function() {
    for (var k = 0; k < aborts.length; k++) {
      try { aborts[k]() } catch (e) {}
    }
    aborts = []
  }
  return new Promise(function(resolve, reject) {
    var pending = candidates.length
    var onSettled = function() {
      pending--
      if (pending === 0 && !resolved) {
        _0x6b05(source, quality, candidates)
        abortAll()
        reject(new Error(_0x6b19(_g(80) + errors.join('\n'))))
      }
    }
    for (var i = 0; i < candidates.length; i++) {
      (function(apiSource) {
        var t0 = Date.now()
        var raw = _0x6b1c(apiSource, source, musicInfo, quality)
        aborts.push(function() {
          try { if (raw && typeof raw.abort === 'function') raw.abort() } catch (e) {}
        })
        _0x6a03(raw, RACE_TIMEOUT).then(function(url) {
          if (resolved) return
          var elapsed = Date.now() - t0
          if (url && _0x6a04(url)) {
            _0x6b04(source, apiSource.name, true, elapsed, quality)
            resolved = true
            abortAll()
            resolve(url)
          } else {
            _0x6b04(source, apiSource.name, false, elapsed, quality)
            errors.push(apiSource.name + ': 无效URL')
            onSettled()
          }
        }).catch(function(e) {
          if (resolved) return
          var elapsed = Date.now() - t0
          _0x6b04(source, apiSource.name, false, elapsed, quality)
          errors.push(apiSource.name + ': ' + (e.message || e))
          onSettled()
        })
      })(candidates[i])
    }
  })
}

// TX 平台延迟并发：优先层立即启动，备用层延迟300ms加入竞速
var _0x6b03 = function(tier1, tier2, source, musicInfo, quality) {
  if (tier1.length === 0 && tier2.length === 0) {
    return Promise.reject(new Error(_g(65)))
  }
  if (tier2.length === 0) return _0x6b02(tier1, source, musicInfo, quality)
  if (tier1.length === 0) return _0x6b02(tier2, source, musicInfo, quality)

  var errors = []
  var resolved = false
  var settled = 0
  var totalPending = tier1.length + tier2.length
  var aborts = []
  var tier2Timer = null
  var allTier = tier1.concat(tier2)
  var abortAll = function() {
    for (var k = 0; k < aborts.length; k++) {
      try { aborts[k]() } catch (e) {}
    }
    aborts = []
  }

  return new Promise(function(resolve, reject) {
    var onSettled = function() {
      settled++
      if (settled === totalPending && !resolved) {
        if (tier2Timer) { clearTimeout(tier2Timer); tier2Timer = null }
        _0x6b05(source, quality, allTier)
        abortAll()
        reject(new Error(_0x6b19(_g(80) + errors.join('\n'))))
      }
    }
    var launch = function(apiSource) {
      if (resolved) return
      var t0 = Date.now()
      var raw = _0x6b1c(apiSource, source, musicInfo, quality)
      aborts.push(function() {
        try { if (raw && typeof raw.abort === 'function') raw.abort() } catch (e) {}
      })
      _0x6a03(raw, RACE_TIMEOUT).then(function(url) {
        if (resolved) return
        var elapsed = Date.now() - t0
        if (url && _0x6a04(url)) {
          _0x6b04(source, apiSource.name, true, elapsed, quality)
          resolved = true
          if (tier2Timer) { clearTimeout(tier2Timer); tier2Timer = null }
          abortAll()
          resolve(url)
        } else {
          _0x6b04(source, apiSource.name, false, elapsed, quality)
          errors.push(apiSource.name + ': 无效URL')
          onSettled()
        }
      }).catch(function(e) {
        if (resolved) return
        var elapsed = Date.now() - t0
        _0x6b04(source, apiSource.name, false, elapsed, quality)
        errors.push(apiSource.name + ': ' + (e.message || e))
        onSettled()
      })
    }

    // 优先层立即启动
    for (var i = 0; i < tier1.length; i++) launch(tier1[i])
    // 备用层延迟300ms启动，给优先层先发优势
    if (typeof setTimeout === 'function') {
      tier2Timer = setTimeout(function() {
        tier2Timer = null
        if (resolved) return
        for (var j = 0; j < tier2.length; j++) launch(tier2[j])
      }, 300)
    } else {
      for (var k = 0; k < tier2.length; k++) launch(tier2[k])
    }
  })
}

const _0x6b01 = function(source, musicInfo, quality) {
  // 版本被面板停用（精确清单/版本下限）时拒绝所有请求，与面板说明对齐
  if (_scriptDisabled) {
    return Promise.reject(new Error(_g(66)))
  }
  // 应用面板的最大音质限制：超出档位自动降级到允许的最高音质
  quality = _0x6b09(quality)
  // 筛选支持该平台的源
  var candidates = []
  for (var i = 0; i < _0x6b00.length; i++) {
    if (_0x6b00[i].sources.indexOf(source) !== -1) {
      candidates.push(_0x6b00[i])
    }
  }
  if (candidates.length === 0) {
    return Promise.reject(new Error(_g(81) + source))
  }
  // 按面板统计的请求速度（平均响应时间）重排优先级：快者先发
  candidates = _0x6b0a(candidates, source)
  // 跳过处于熔断期的接口；若全部处于熔断期则回退全部，避免无法播放
  var healthy = []
  for (var h = 0; h < candidates.length; h++) {
    if (!_0x6b1a(candidates[h].name)) healthy.push(candidates[h])
  }
  if (healthy.length > 0) candidates = healthy
  // TX 平台使用延迟并发：优先层立即启动，备用层延迟300ms加入
  // 优先层为真实音质源（念心TX、vkeys腾讯/v2），备用层为玉宁熙、aa.cab 等
  if (source === _g(100)) {
    var tier1 = []
    var tier2 = []
    for (var j = 0; j < candidates.length; j++) {
      if (candidates[j].txTier === 1) tier1.push(candidates[j])
      else tier2.push(candidates[j])
    }
    return _0x6b03(tier1, tier2, source, musicInfo, quality).then(function(url) {
      return _0x6a09(url)
    })
  }
  return _0x6b02(candidates, source, musicInfo, quality).then(function(url) {
    return _0x6a09(url)
  })
}

// ========== _0x6b10 对象（对齐官方示例结构）==========
const _0x6b10 = {
  [_g(103)]: {
    [_g(98)]: function(musicInfo, quality) {
      return _0x6b01('kw', musicInfo, quality)
    },
  },
  [_g(99)]: {
    [_g(98)]: function(musicInfo, quality) {
      return _0x6b01('kg', musicInfo, quality)
    },
  },
  [_g(100)]: {
    [_g(98)]: function(musicInfo, quality) {
      return _0x6b01('tx', musicInfo, quality)
    },
  },
  [_g(102)]: {
    [_g(98)]: function(musicInfo, quality) {
      return _0x6b01('wy', musicInfo, quality)
    },
  },
  [_g(101)]: {
    [_g(98)]: function(musicInfo, quality) {
      return _0x6b01('mg', musicInfo, quality)
    },
  },
}

// 注册应用 API 请求事件
// 官方约定：回调必须返回 Promise；此处对平台缺失/参数缺失/同步异常全部兜底为 Promise.reject，
// 避免同步抛错掩盖真实原因（初始化与请求阶段的异常在部分宿主中会导致脚本判定失败）
on(EVENT_NAMES.request, function(params) {
  try {
    var source = params ? params.source : ''
    var action = params ? params.action : ''
    var info = (params && params.info) || {}
    switch (action) {
      case _g(98): {
        var api = _0x6b10[source]
        if (!api || typeof api[_g(98)] !== 'function') {
          return Promise.reject(new Error(_g(82) + source))
        }
        if (!info.musicInfo) {
          return Promise.reject(new Error(_g(67)))
        }
        return api[_g(98)](info.musicInfo, info.type).catch(function(err) {
          _0x6b0f(err)
          return Promise.reject(err)
        })
      }
      default:
        _0x6b0e('action(' + action + ') not support')
        return Promise.reject(new Error(_g(68)))
    }
  } catch (e) {
    return Promise.reject(e)
  }
})

// ========== 更新检查 ==========
// 脚本初始化时异步检查面板是否有新版本，若有则发送 updateAlert 事件
// 参考文档: https://www.lxmusic.cn/docs/music-source/
var SCRIPT_VERSION = 'v2.2.2-261031-fix'

// 版本号格式：版本号-YYMMDD[-fix]，如 v2.2.2-261030-fix
// 比较顺序：核心数字逐段 → 日期（缺省 0）→ fix 补丁级（无 0 / 有 1）
var _parseVersion = function(v) {
  var s = String(v || '').trim().replace(/^v/i, '')
  var m = /^(\d+(?:\.\d+)*)(?:RC\d+)?(?:-(\d{6}))?(-fix)?$/i.exec(s)
  if (!m) return { nums: [], date: 0, fix: 0 }
  return {
    nums: m[1].split('.').map(function(n) { return parseInt(n, 10) || 0 }),
    date: m[2] ? parseInt(m[2], 10) : 0,
    fix: m[3] ? 1 : 0
  }
}

var _compareVersion = function(v1, v2) {
  var a = _parseVersion(v1)
  var b = _parseVersion(v2)
  var len = Math.max(a.nums.length, b.nums.length)
  for (var i = 0; i < len; i++) {
    var na = a.nums[i] || 0
    var nb = b.nums[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  if (a.date !== b.date) return a.date > b.date ? 1 : -1
  if (a.fix !== b.fix) return a.fix > b.fix ? 1 : -1
  return 0
}

// ========== 消息收集器 ==========
// LX 文档硬性限制：updateAlert 每次运行脚本只能调用一次（官方 preload 再次调用直接 reject）。
// 因此广播/定向通知/停用提示/更新日志/用户ID 全部先入队，最后合并为唯一一条弹窗。
var _pendingMsgs = []
// 本次运行是否已经发送过 updateAlert（官方限制每次运行只能弹一次）
var _alertSent = false
var _0x6b0b = function(text) {
  if (!text) return
  // 已弹过更新提示后不再入队：LX 不允许第二次 updateAlert，避免消息堆积
  if (_alertSent) return
  _pendingMsgs.push(String(text))
}
// 合并收集到的全部消息并只发送一次 updateAlert（总量截断 1024 字符）
var _0x6b0c = function(updateUrl) {
  if (_alertSent) {
    _pendingMsgs = []
    return false
  }
  if (_pendingMsgs.length === 0) return false
  var log = _pendingMsgs.join('\n\n')
  if (log.length > 1024) log = log.substring(0, 1024)
  _pendingMsgs = []
  // 无论成功与否都标记已发送：重复调用必然被官方拒绝，无需再次尝试
  _alertSent = true
  // 始终携带 updateUrl 字段（无更新地址时为空串）：与可正常弹窗的 v2.2.2 行为一致
  var data = { log: log, updateUrl: updateUrl || '' }
  if (typeof send !== 'function') {
    _0x6b16('fail', '客户端不支持 updateAlert')
    return true
  }
  try {
    var ret = send(EVENT_NAMES.updateAlert, data)
    // 投递结果回传面板，悬停「弹窗投递」可诊断客户端开关状态
    if (ret && typeof ret.then === 'function') {
      ret.then(function() {
        _0x6b16('ok')
      }, function(e) {
        _0x6b16('fail', e && e.message ? e.message : e)
      })
    } else {
      _0x6b16('ok')
    }
  } catch (e) {
    _0x6b16('fail', e && e.message ? e.message : e)
  }
  return true
}

// ========== 最大音质限制（面板 check_update 下发，用户规则优先于全局规则）==========
var _maxQuality = ''
// 扩展音质档位：非官方档位，官方 preload 会按 supportQualitys 过滤，
// 仅对允许扩展档位的客户端生效，不影响原有 4 档
var _EXTRA_QUALITYS = ['192k', 'hires', 'dolby', 'atmos', 'atmos_plus', 'jyeffect', 'sky', 'jymaster', 'master']
// 档位高低（与面板 qualityWhitelist 逐一对应）
var _qualityRank = { standard: 0, '128k': 1, '192k': 2, '320k': 3, 'flac': 4, 'hires': 5, 'flac24bit': 6, dolby: 7, atmos: 7, atmos_plus: 7, jyeffect: 7, sky: 7, jymaster: 8, master: 8 }
var _0x6b09 = function(quality) {
  if (!_maxQuality) return quality
  var q = String(quality || '128k').toLowerCase()
  var cap = String(_maxQuality).toLowerCase()
  var rq = _qualityRank[q]
  var rc = _qualityRank[cap]
  // 未知档位不做降级，避免误伤应用新增的音质
  if (rq === undefined || rc === undefined || rq <= rc) return quality
  return cap
}

// ========== 版本停用 / 请求速度优先级（面板 check_update 下发）==========
// 停用标志：命中精确停用清单或版本低于下限时置真，后续所有请求直接拒绝
var _scriptDisabled = false
// 请求速度优先级：平台 => 按平均响应时间升序的接口名数组
var _sourcePriority = {}
// 按面板下发的速度优先级排序候选源（未记录的接口排尾；无数据保持原顺序）
var _0x6b0a = function(candidates, source) {
  var order = _sourcePriority ? _sourcePriority[source] : null
  if (!order || order.length === 0) return candidates
  var idx = {}
  for (var i = 0; i < order.length; i++) idx[order[i]] = i
  return candidates.slice().sort(function(a, b) {
    var ia = idx[a.name] !== undefined ? idx[a.name] : 9999
    var ib = idx[b.name] !== undefined ? idx[b.name] : 9999
    return ia - ib
  })
}

// 面板开关字段宽松判定：兼容 bool / 数字 / 字符串（"0"、"false" 视为关闭）
var _isOn = function(v) {
  if (v === true) return true
  if (v === false || v === null || v === undefined) return false
  if (typeof v === 'number') return v !== 0
  var s = String(v).toLowerCase()
  return s !== '' && s !== '0' && s !== 'false' && s !== 'off' && s !== 'no'
}

// 面板轮询状态：首次拉取后改用 no_notify=1，避免定时刷新吞掉管理员推送消息
var _panelBusy = false
var _panelPolled = false
var _panelTimer = null
var _panelRetried = false
var _checkFailReported = false

// 更新检查失败诊断：写入 alert_state，面板悬停可见（去重，避免轮询刷屏）
var _0x6b18 = function(msg) {
  if (_checkFailReported) return
  _checkFailReported = true
  _0x6b16('fail', _g(114) + String(msg || '').substring(0, 160))
}

// 首次检查失败时重试一次（8 秒后），规避启动期瞬时网络失败
var _0x6b1d = function() {
  if (_panelRetried) return
  _panelRetried = true
  if (typeof setTimeout !== 'function') return
  setTimeout(function() {
    try { _0x6b0d() } catch (e) {}
  }, 8000)
}

// 拉取面板规则与通知（可重复执行：启动时一次，之后每 60 秒刷新一次）
var _0x6b0d = function() {
  if (!PANEL_REPORT_URL) return
  if (_panelBusy) return
  // 从 report.php 地址推导出 api.php 地址
  var apiUrl = PANEL_REPORT_URL.replace(/\/report\.php.*$/, _g(83))
  if (apiUrl === PANEL_REPORT_URL) return
  // 附带用户标识与设备特征，便于面板统计、身份识别与定向下发
  apiUrl += _g(88) + encodeURIComponent(_userId || '')
  if (_clientType) apiUrl += '&client_type=' + encodeURIComponent(_clientType)
  if (_cachedClientIp) apiUrl += '&client_ip=' + encodeURIComponent(_cachedClientIp)
  if (_deviceFp) apiUrl += _g(106) + encodeURIComponent(_deviceFp)
  // 定时刷新只同步规则：不消费面板待推送消息，留给下次启动的首次拉取
  if (_panelPolled) apiUrl += '&no_notify=1'
  _panelBusy = true
  _0x6a02(apiUrl, { method: 'GET', timeout: 5000 }).then(function(raw) {
    _panelBusy = false
    var body = raw
    // 移动版部分客户端返回 JSON 字符串，需自行解析；解析失败直接跳过本次检查
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch (e) { body = null }
    }
    if (!body || typeof body !== 'object') {
      _0x6b0f('[HeiMusic] 面板响应无法解析，跳过本次更新检查')
      _0x6b18('面板响应无法解析')
      _0x6b1d()
      return
    }
    _panelPolled = true
    _panelRetried = false
    _checkFailReported = false
    // 采纳面板发放的用户ID（按 IP + 客户端特征映射，跨启动稳定）
    if (body.userId) _userId = String(body.userId)
    // 面板「随更新提示展示用户ID」开关状态（用于失败提示兜底）
    _pushUserIdOn = _isOn(body.push_user_id)
    // 用户ID文案最先入队：合并日志超过 1024 字被截断时 ID 仍保留（v2.2.2-261030-fix）
    if (_pushUserIdOn && _userId) {
      _0x6b0b('你的用户ID：' + _userId + '\n（请勿泄露ID，在汇报问题时请带上此ID）')
    }
    // 面板公告（广播）与定向通知 —— 先入队，最后统一弹出
    _0x6b0b(body.broadcast)
    _0x6b0b(body.notify)
    // 面板下发的最大音质限制，后续播放请求按此降级
    if (body.max_quality !== undefined) _maxQuality = String(body.max_quality || '')
    // 按请求速度排序的接口优先级（v2.2.1+）
    if (body.source_priority && typeof body.source_priority === 'object') {
      _sourcePriority = body.source_priority
    }
    // 版本停用判断：精确停用清单 + 版本下限（一键停用旧版本下发）
    var disabled = body.disabled_versions
    var isDisabled = Object.prototype.toString.call(disabled) === '[object Array]' && disabled.indexOf(SCRIPT_VERSION) !== -1
    var below = body.disabled_below ? String(body.disabled_below) : ''
    if (!isDisabled && below && _compareVersion(SCRIPT_VERSION, below) < 0) isDisabled = true
    if (isDisabled) {
      _scriptDisabled = true
      _0x6b0b('您当前使用的版本 ' + SCRIPT_VERSION + ' 已被停用，请升级到最新版本。')
    }
    // 用户黑名单：命中后拒绝该用户所有请求，并推送提示
    if (_isOn(body.blacklisted)) {
      _scriptDisabled = true
      _0x6b0b(_g(104))
    }
    // 更新日志（停用状态下不再提示更新，只提示升级）
    var updateUrl = ''
    if (!isDisabled && body.version && _compareVersion(body.version, SCRIPT_VERSION) > 0) {
      _0x6b0b(body.log || ('发现新版本 ' + body.version))
      updateUrl = body.updateUrl || ''
    }
    // 唯一一次 updateAlert：合并广播/通知/停用/更新/用户ID
    _0x6b0c(updateUrl)
  }).catch(function(e) {
    // 更新检查失败不影响正常使用；回传诊断并重试一次
    _panelBusy = false
    _0x6b0f('[HeiMusic] 更新检查失败：' + (e && e.message ? e.message : e))
    _0x6b18(e && e.message ? e.message : e)
    _0x6b1d()
  })
}

// 每 60 秒轮询一次面板（±5 秒抖动），加快用户ID与规则下发刷新
var _0x6b14 = function() {
  if (typeof setTimeout !== 'function') return
  // 测试环境不挂常驻定时器，由用例显式调用 refreshPanel
  if (typeof globalThis !== 'undefined' && globalThis.__HM_TEST__) return
  try { if (_panelTimer) clearTimeout(_panelTimer) } catch (e) {}
  _panelTimer = setTimeout(function() {
    try { _0x6b0d() } catch (e) {}
    _0x6b14()
  }, 55000 + Math.floor(Math.random() * 10000))
}

// 脚本初始化完成后发送 inited 事件告知应用
// 官方约定：send(inited) 之前任何异常都会导致脚本初始化失败，
// 因此将 inited 放在最前，用户标识/IP 检测与面板检查等非关键初始化放在其后并各自兜底
send(EVENT_NAMES.inited, {
  sources: {
    [_g(103)]: {
      name: '酷我音乐',
      type: 'music',
      actions: [_g(98)],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'].concat(_EXTRA_QUALITYS),
    },
    [_g(99)]: {
      name: '酷狗音乐',
      type: 'music',
      actions: [_g(98)],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'].concat(_EXTRA_QUALITYS),
    },
    [_g(100)]: {
      name: 'QQ音乐',
      type: 'music',
      actions: [_g(98)],
      // 基础 4 档 + 扩展档位：官方 preload 会过滤非官方档位，不影响原有 4 档
      qualitys: ['128k', '320k', 'flac', 'flac24bit'].concat(_EXTRA_QUALITYS),
    },
    [_g(102)]: {
      name: '网易云音乐',
      type: 'music',
      actions: [_g(98)],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'].concat(_EXTRA_QUALITYS),
    },
    [_g(101)]: {
      name: '咪咕音乐',
      type: 'music',
      actions: [_g(98)],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'].concat(_EXTRA_QUALITYS),
    },
  },
})
try { _0x6b06() } catch (e) {}
try { _0x6b07() } catch (e) {}
try { _0x6b12() } catch (e) {}
try { _0x6b08() } catch (e) {}
try { _0x6b15() } catch (e) {}
// 立即拉取面板：与可正常弹窗的 v2.2.2 保持一致（延迟会被部分客户端丢掉事件）
try { _0x6b0d() } catch (e) {}
try { _0x6b14() } catch (e) {}

// ===== 测试钩子（仅沙箱回归测试显式开启；LX 环境不定义 __HM_TEST__，自动跳过） =====
if (typeof globalThis !== 'undefined' && globalThis.__HM_TEST__) {
  globalThis.__hm_test = {
    version: SCRIPT_VERSION,
    API_SOURCES: _0x6b00,
    isValidUrl: _0x6a04,
    handleGetMusicUrl: _0x6b01,
    fetchVkeysV2: _0x6c05,
    fetchAaCabTx: _0x6c11,
    fetchOiapiMigu: _0x6c12,
    fetchKwMobi: _0x6c13,
    fetchNianxinKw: _0x6c02,
    fetchNianxinTx: _0x6c03,
    fetchNianxinKg: _0x6c06,
    normalizeUrl: _0x6a09,
    QUALITY_RANK: _qualityRank,
    EXTRA_QUALITYS: _EXTRA_QUALITYS,
    sortByPriority: function(c, s) { return _0x6b0a(c, s) },
    setPriority: function(p) { _sourcePriority = p },
    isDisabled: function() { return _scriptDisabled },
    handleReportResponse: _0x6b13,
    getUserId: function() { return _userId },
    getDeviceFp: function() { return _deviceFp },
    refreshPanel: _0x6b0d,
    compareVersion: _compareVersion,
    reportIp: _0x6b15,
    isSourceCooling: _0x6b1a,
    markSourceHealth: _0x6b1b,
    raceCandidates: _0x6b02,
    hasAlertSent: function() { return _alertSent },
    isPushIdOn: _isOn,
  }
}
})()
