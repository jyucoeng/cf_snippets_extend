// Snippets Manager - Cloudflare Workers 单文件版本
import { connect } from 'cloudflare:sockets';

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CF Snippets Extend</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh}
.container{max-width:1000px;margin:0 auto;padding:20px}
.login-container{display:flex;justify-content:center;align-items:center;min-height:100vh}
.login-box{background:#fff;padding:40px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:100%;max-width:400px}
.login-box h1{text-align:center;color:#667eea;margin-bottom:30px}
.form-group{margin-bottom:20px}
.form-group label{display:block;margin-bottom:8px;color:#333;font-weight:500}
.form-group input,.form-group select{width:100%;padding:12px;border:2px solid #e1e8ed;border-radius:8px;font-size:16px}
.form-group input:focus{outline:none;border-color:#667eea}
.btn{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:14px;transition:all .2s}
.btn-primary{background:#667eea;color:#fff}
.btn-primary:hover{background:#5568d3}
.btn-success{background:#48c774;color:#fff}
.btn-success:hover{background:#3abb67}
.btn-warning{background:#ffdd57;color:#333}
.btn-warning:hover{background:#ffd83d}
.btn-danger{background:#f14668;color:#fff}
.btn-danger:hover{background:#ef2e4a}
.btn-sm{padding:4px 10px;font-size:12px;white-space:nowrap}
.btn-full{width:100%;padding:12px}
.hidden{display:none!important}
.header{background:#fff;padding:20px;border-radius:16px;margin-bottom:20px;box-shadow:0 4px 20px rgba(0,0,0,.1);display:flex;justify-content:space-between;align-items:center}
.header h1{color:#667eea;font-size:24px}
.tabs{display:flex;gap:10px;background:#fff;padding:10px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.tab{padding:10px 20px;border:none;background:transparent;cursor:pointer;border-radius:8px;font-size:14px;color:#666;white-space:nowrap}
.tab.active{background:#667eea;color:#fff}
.panel{background:#fff;padding:24px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.panel-header h2{font-size:18px;color:#333}
.table{width:100%;border-collapse:collapse}
.table th,.table td{padding:10px 8px;text-align:left;border-bottom:1px solid #e1e8ed;font-size:14px;vertical-align:middle}
.table th{background:#f7f9fc;color:#333;font-weight:600}
.badge{padding:3px 8px;border-radius:4px;font-size:11px}
.badge-info{background:#e3f2fd;color:#1976d2}
.actions{display:flex;gap:6px;align-items:center;flex-wrap:nowrap}
.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;z-index:1000}
.modal-content{background:#fff;padding:24px;border-radius:16px;width:100%;max-width:450px}
.modal-content-large{background:#fff;padding:24px;border-radius:16px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.modal-header h3{font-size:18px;color:#333}
.close-btn{background:none;border:none;font-size:24px;cursor:pointer;color:#999}
.alert{padding:12px;border-radius:8px;margin-bottom:16px}
.alert-success{background:#e8f5e9;color:#2e7d32}
.alert-error{background:#ffebee;color:#c62828}
.result-box{background:#f7f9fc;padding:16px;border-radius:8px;margin-top:16px}
.result-box pre{background:#fff;padding:12px;border-radius:4px;font-size:12px;white-space:pre-wrap;word-break:break-all;max-height:150px;overflow:auto}
.switch{position:relative;display:inline-block;width:44px;height:24px}
.switch input{opacity:0;width:0;height:0}
.slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccc;border-radius:24px}
.slider:before{position:absolute;content:"";height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.3s}
input:checked+.slider{background:#667eea}
input:checked+.slider:before{transform:translateX(20px)}
.addr-cell{max-width:200px;word-break:break-all;cursor:help}
.loading{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;z-index:2000}
.loading-spinner{width:50px;height:50px;border:4px solid #f3f3f3;border-top:4px solid #667eea;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.btn:disabled{opacity:.6;cursor:not-allowed}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px}
.outbound-card{background:#fff;border:2px solid #e1e8ed;border-radius:12px;padding:16px;position:relative;transition:all .3s}
.outbound-card:hover{box-shadow:0 4px 12px rgba(102,126,234,.2)}
.outbound-card.offline{border-color:#e1e8ed;background:#fff}
.outbound-card.online{border-color:#e1e8ed;background:#fff}
.outbound-card.tested-online{border-color:#48c774;background:#f0fdf4}
.outbound-card.tested-offline{border-color:#f14668;background:#fff5f7}
.card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.card-title{font-size:16px;font-weight:600;color:#333;margin-bottom:4px;word-break:break-word}
.card-checkbox{position:absolute;top:12px;right:12px}
.card-status{display:inline-flex;align-items:center;gap:6px;font-size:13px;margin-bottom:8px}
.status-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.status-dot.online{background:#48c774}
.status-dot.offline{background:#f14668}
.status-dot.unknown{background:#999}
.card-info{font-size:13px;color:#666;margin-bottom:8px;line-height:1.6}
.card-info-row{display:flex;justify-content:space-between;margin-bottom:4px}
.card-latency{font-size:24px;font-weight:bold;text-align:center;margin:12px 0;min-height:36px}
.card-latency.good{color:#48c774}
.card-latency.medium{color:#ffdd57}
.card-latency.bad{color:#f14668}
.card-latency.unknown{color:#999;font-size:14px}
.card-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
.card-actions .btn{flex:1;min-width:70px}

</style>
</head>
<body>
<div id="loginPage" class="login-container">
<div class="login-box">
<h1 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🔐 CF Snippets Extend</h1>
<div id="loginAlert"></div>
<div class="form-group"><label>API Key</label><input type="password" id="apiKeyInput" placeholder="请输入 API Key"></div>
<button class="btn btn-primary btn-full" onclick="login()">登录</button>
<div style="text-align:center;margin-top:16px">
<a href="https://github.com/assast/cf_snippets_extend" target="_blank" style="display:inline-flex;align-items:center;gap:4px;color:#667eea;text-decoration:none;font-size:13px;transition:all .2s" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
<svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
⭐ Star on GitHub
</a>
</div>
</div>
</div>

<div id="mainPage" class="container hidden">
<div class="header">
<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
<h1 style="margin:0;white-space:nowrap">📡 CF Snippets Extend</h1>
<a href="https://github.com/assast/cf_snippets_extend" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#24292e;color:#fff;text-decoration:none;border-radius:4px;font-size:11px;transition:all .2s;white-space:nowrap" onmouseover="this.style.background='#1a1e22'" onmouseout="this.style.background='#24292e'">
<svg height="12" width="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
Star
</a>
</div>
<div style="display:flex;gap:8px;flex-shrink:0"><button class="btn btn-success btn-sm" onclick="exportData()">📤 导出</button><button class="btn btn-primary btn-sm" onclick="importData()">📥 导入</button><button class="btn btn-danger btn-sm" onclick="logout()">退出</button></div>
</div>
<div class="tabs">
<button class="tab active" onclick="switchTab('proxyip',this)">ProxyIP</button>
<button class="tab" onclick="switchTab('outbound',this)">全局出站</button>
<button class="tab" onclick="switchTab('cfip',this)">CFIP</button>
<button class="tab" onclick="switchTab('vlessSubscribe',this)">订阅生成VLESS</button>
<button class="tab" onclick="switchTab('ssSubscribe',this)">订阅生成SS</button>
</div>

<div id="proxyipPanel" class="panel">
<div class="panel-header">
<h2>ProxyIP 管理</h2>
<div style="display:flex;gap:8px">
<button class="btn btn-primary btn-sm" onclick="showBatchModal('proxyip')">+ 添加</button>
<button class="btn btn-success btn-sm" onclick="batchEnable('proxyip',true)">✓ 批量启用</button>
<button class="btn btn-warning btn-sm" onclick="batchEnable('proxyip',false)">✗ 批量禁用</button>
<button class="btn btn-danger btn-sm" onclick="batchDelete('proxyip')">🗑️ 删除</button>
</div>
</div>
<div style="background:#e8f0fe;padding:10px;border-radius:6px;margin-bottom:12px;font-size:13px;color:#1967d2">
<strong>💡 说明：</strong>ProxyIP 用于普通 IP/域名代理，不支持 SOCKS5/HTTP 协议。如需添加 SOCKS5/HTTP 代理，请使用"全局出站"功能。
</div>
<table class="table"><thead><tr><th><input type="checkbox" id="proxyipCheckAll" onchange="checkAll('proxyip',this.checked)"></th><th>ID</th><th>地址</th><th>备注</th><th>状态</th><th>操作</th></tr></thead><tbody id="proxyipTable"></tbody></table>
</div>

<div id="outboundPanel" class="panel hidden">
<div class="panel-header">
<h2>全局出站管理</h2>
<div style="display:flex;gap:8px;flex-wrap:wrap">
<button id="toggleViewBtn" class="btn btn-primary btn-sm" onclick="toggleOutboundView()">📋 切换卡片</button>
<button id="toggleMaskBtn" class="btn btn-warning btn-sm" onclick="toggleAddressMask()">👁️ 显示地址</button>
<button class="btn btn-primary btn-sm" onclick="showBatchModal('outbound')">+ 添加</button>
<button class="btn btn-success btn-sm" onclick="batchEnable('outbound',true)">✓ 批量启用</button>
<button class="btn btn-warning btn-sm" onclick="batchEnable('outbound',false)">✗ 批量禁用</button>
<button class="btn btn-success btn-sm" onclick="testAllOutbounds()">🔍 全量测速</button>
<button class="btn btn-primary btn-sm" onclick="checkAllExits()">🌍 出站检测</button>
<button class="btn btn-danger btn-sm" onclick="batchDelete('outbound')">🗑️ 删除</button>
</div>
</div>
<div style="background:#e8f0fe;padding:10px;border-radius:6px;margin-bottom:12px;font-size:13px;color:#1967d2">
<strong>💡 测速说明：</strong><br>
1、测速过程仅从CF的边缘节点发起连接，所以被墙的节点也可以测延迟，同时因为不会过墙，所以不会导致节点被墙；延迟仅代表CF边缘节点到socks5/http节点的延迟，用于判断节点是否连通，实际使用受优选IP/域名影响可能差异较大。<br>
2、本地代理（127.0.0.1）无法从 CF 访问会显示离线。
</div>
<div id="outboundListView">
<table class="table"><thead><tr><th><input type="checkbox" id="outboundCheckAll" onchange="checkAll('outbound',this.checked)"></th><th>ID</th><th>地址</th><th>类型</th><th>出站信息</th><th>备注</th><th>延迟</th><th>状态</th><th>操作</th></tr></thead><tbody id="outboundTable"></tbody></table>
</div>
<div id="outboundCardView" class="card-grid hidden"></div>
</div>

<div id="cfipPanel" class="panel hidden">
<div class="panel-header">
<h2>CFIP 管理</h2>
<div style="display:flex;gap:8px">
<button class="btn btn-primary btn-sm" onclick="showBatchModal('cfip')">+ 添加</button>
<button class="btn btn-success btn-sm" onclick="batchEnable('cfip',true)">✓ 批量启用</button>
<button class="btn btn-warning btn-sm" onclick="batchEnable('cfip',false)">✗ 批量禁用</button>
<button class="btn btn-danger btn-sm" onclick="batchDelete('cfip')">🗑️ 删除</button>
</div>
</div>
<table class="table"><thead><tr><th><input type="checkbox" id="cfipCheckAll" onchange="checkAll('cfip',this.checked)"></th><th>ID</th><th>地址</th><th>端口</th><th>备注</th><th>状态</th><th>操作</th></tr></thead><tbody id="cfipTable"></tbody></table>
</div>

<div id="vlessSubscribePanel" class="panel hidden">
<h2 style="margin-bottom:16px">VLESS 订阅生成</h2>
<div id="vlessAlert"></div>

<div class="form-group"><label>UUID</label><input type="text" id="vlessUuidInput" placeholder="12cbf86b-22bb-45b6-aadb-cb622a538d6a"></div>
<div class="form-group"><label>Snippets/Worker 域名</label><input type="text" id="vlessDomainInput" placeholder="your-worker.workers.dev"></div>
<div class="form-group"><label>Path</label><input type="text" id="vlessPathInput" placeholder="/?ed=2560"></div>

<button class="btn btn-primary" onclick="generateVless()">💾 保存并生成订阅</button>

<div id="vlessResult" class="result-box hidden">
<p><b>订阅地址:</b></p><pre id="vlessSubUrl"></pre><button class="btn btn-success btn-sm" onclick="copy('vlessSubUrl')">复制</button>
<p style="margin-top:12px"><b>Clash 订阅地址:</b></p><pre id="vlessClashUrl"></pre><button class="btn btn-success btn-sm" onclick="copy('vlessClashUrl')">复制</button>
</div>
</div>

<div id="ssSubscribePanel" class="panel hidden">
<h2 style="margin-bottom:16px">Shadowsocks 订阅生成</h2>
<div id="ssAlert"></div>

<div class="form-group"><label>密码 (Password)</label><input type="text" id="ssPasswordInput" placeholder="your-password"></div>
<div class="form-group"><label>Snippets/Worker 域名</label><input type="text" id="ssDomainInput" placeholder="your-worker.workers.dev"></div>
<div class="form-group"><label>Path (留空则使用密码)</label><input type="text" id="ssPathInput" placeholder="留空则使用密码作为路径"></div>

<button class="btn btn-primary" onclick="generateSS()">💾 保存并生成订阅</button>

<div id="ssResult" class="result-box hidden">
<p><b>订阅地址:</b></p><pre id="ssSubUrl"></pre><button class="btn btn-success btn-sm" onclick="copy('ssSubUrl')">复制</button>
<p style="margin-top:12px"><b>Clash 订阅地址:</b></p><pre id="ssClashUrl"></pre><button class="btn btn-success btn-sm" onclick="copy('ssClashUrl')">复制</button>
</div>
</div>
</div>

<div id="addModal" class="modal hidden">
<div class="modal-content">
<div class="modal-header"><h3 id="modalTitle">添加</h3><button class="close-btn" onclick="closeModal()">&times;</button></div>
<div id="modalBody"></div>
<button class="btn btn-primary btn-full" style="margin-top:16px" onclick="submitModal()">确定</button>
</div>
</div>

<div id="batchModal" class="modal hidden">
<div class="modal-content" style="max-width:600px">
<div class="modal-header"><h3 id="batchModalTitle">批量添加</h3><button class="close-btn" onclick="closeBatchModal()">&times;</button></div>
<div id="batchAlert"></div>
<div id="batchHelp" style="background:#f7f9fc;padding:10px;border-radius:6px;margin-bottom:12px;font-size:12px;color:#666"></div>
<div class="form-group"><label>批量数据（每行一条）</label><textarea id="batchInput" rows="10" style="width:100%;padding:12px;border:2px solid #e1e8ed;border-radius:8px;font-size:14px;font-family:monospace"></textarea></div>
<button class="btn btn-primary btn-full" style="margin-top:16px" onclick="submitBatch()">批量添加</button>
</div>
</div>

<div id="loadingOverlay" class="loading hidden">
<div class="loading-spinner"></div>
</div>

<input type="file" id="importFileInput" accept=".json" style="display:none" onchange="handleImportFileSelect(event)">

<div id="importModeModal" class="modal hidden">
<div class="modal-content" style="max-width:500px">
<div class="modal-header"><h3>选择导入模式</h3><button class="close-btn" onclick="closeImportModeModal()">&times;</button></div>
<div style="margin-bottom:20px;font-size:14px;color:#666">
<p style="margin-bottom:12px">请选择导入方式：</p>
</div>
<button class="btn btn-success" style="width:100%;margin-bottom:12px;padding:16px;text-align:left" onclick="confirmImportMode('append')">
<div style="font-size:16px;font-weight:bold;margin-bottom:4px">📥 作为新数据导入</div>
<div style="font-size:12px;opacity:0.9">将导入的数据添加到现有数据中，不会删除任何现有数据</div>
</button>
<button class="btn btn-danger" style="width:100%;padding:16px;text-align:left" onclick="confirmImportMode('replace')">
<div style="font-size:16px;font-weight:bold;margin-bottom:4px">⚠️ 完全覆盖导入</div>
<div style="font-size:12px;opacity:0.9">删除所有现有数据，然后导入新数据（危险操作）</div>
</button>
</div>
</div>

<div id="exitDetailModal" class="modal hidden" onclick="if(event.target===this)closeExitDetail()">
<div class="modal-content-large">
<div class="modal-header"><h3>出入站详细信息</h3><button class="close-btn" onclick="closeExitDetail()">&times;</button></div>
<div id="exitDetailBody" style="font-size:14px;line-height:1.8"></div>
</div>
</div>

<script>
const API='/api';
let apiKey=localStorage.getItem('apiKey'),modalType='',editId=null;
let showFullAddress=false; // 是否显示完整地址
let outboundViewMode=localStorage.getItem('outboundViewMode')||'list'; // 视图模式：list 或 card

function showLoading(){document.getElementById('loadingOverlay').classList.remove('hidden')}
function hideLoading(){document.getElementById('loadingOverlay').classList.add('hidden')}

function toggleOutboundView(){
outboundViewMode=outboundViewMode==='list'?'card':'list';
localStorage.setItem('outboundViewMode',outboundViewMode);
const btn=document.getElementById('toggleViewBtn');
if(outboundViewMode==='card'){
btn.textContent='📋 切换列表';
document.getElementById('outboundListView').classList.add('hidden');
document.getElementById('outboundCardView').classList.remove('hidden');
}else{
btn.textContent='📋 切换卡片';
document.getElementById('outboundListView').classList.remove('hidden');
document.getElementById('outboundCardView').classList.add('hidden');
}
loadOutbounds();
}

function toggleAddressMask(){
showFullAddress=!showFullAddress;
const btn=document.getElementById('toggleMaskBtn');
if(showFullAddress){
btn.textContent='🔒 隐藏地址';
btn.classList.remove('btn-warning');
btn.classList.add('btn-success');
}else{
btn.textContent='👁️ 显示地址';
btn.classList.remove('btn-success');
btn.classList.add('btn-warning');
}
loadOutbounds();
}

function maskAddress(addr){
if(!addr)return'-';
// 如果选择显示完整地址，直接返回
if(showFullAddress)return addr;
// 只处理 socks5:// 和 http:// 开头的地址
if(addr.includes('://')){
// 完全隐藏地址，只显示 ***
return '***';
}
// 其他地址不处理
return addr;
}

document.addEventListener('DOMContentLoaded',()=>{if(apiKey)checkSession()});
document.getElementById('apiKeyInput').onkeypress=e=>{if(e.key==='Enter')login()};

async function checkSession(){
showLoading();
try{const r=await fetch(API+'/proxyip',{headers:{'X-API-Key':apiKey}});if(r.ok){showMain();load()}else logout()}catch(e){logout()}
finally{hideLoading()}
}

async function login(){
const k=document.getElementById('apiKeyInput').value.trim();
if(!k)return alert('请输入API Key');
showLoading();
try{
const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:k})});
const d=await r.json();
if(d.success){apiKey=d.apiKey;localStorage.setItem('apiKey',apiKey);showMain();load()}
else alert(d.error||'登录失败');
}catch(e){alert('网络错误')}
finally{hideLoading()}
}

function logout(){apiKey=null;localStorage.removeItem('apiKey');document.getElementById('loginPage').classList.remove('hidden');document.getElementById('mainPage').classList.add('hidden')}
function showMain(){document.getElementById('loginPage').classList.add('hidden');document.getElementById('mainPage').classList.remove('hidden')}

function switchTab(t,el){
document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));
el.classList.add('active');document.getElementById(t+'Panel').classList.remove('hidden');
}

async function api(path,method='GET',body=null){
const opt={method,headers:{'Content-Type':'application/json','X-API-Key':apiKey}};
if(body)opt.body=JSON.stringify(body);
return(await fetch(API+path,opt)).json();
}

async function load(){
showLoading();
try{
await Promise.all([loadProxyIPs(),loadOutbounds(),loadCFIPs(),loadVlessConfig(),loadSSConfig()]);
}finally{
hideLoading();
}
}

async function loadVlessConfig(){
const d=await api('/subscribe/vless/config');
if(d.success&&d.data){
document.getElementById('vlessUuidInput').value=d.data.uuid||'';
document.getElementById('vlessDomainInput').value=d.data.snippets_domain||'';
document.getElementById('vlessPathInput').value=d.data.proxy_path||'';
if(d.data.uuid&&d.data.snippets_domain){
const subUrl=location.origin+'/sub/'+d.data.uuid;
const clashUrl='https://sublink.eooce.com/clash?config='+encodeURIComponent(subUrl);
document.getElementById('vlessSubUrl').textContent=subUrl;
document.getElementById('vlessClashUrl').textContent=clashUrl;
document.getElementById('vlessResult').classList.remove('hidden');
}
}
}

async function loadSSConfig(){
const d=await api('/subscribe/ss/config');
if(d.success&&d.data){
document.getElementById('ssPasswordInput').value=d.data.password||'';
document.getElementById('ssDomainInput').value=d.data.snippets_domain||'';
document.getElementById('ssPathInput').value=d.data.proxy_path||'';
if(d.data.password&&d.data.snippets_domain){
const subUrl=location.origin+'/sub/ss/'+d.data.password;
const clashUrl='https://sublink.eooce.com/clash?config='+encodeURIComponent(subUrl);
document.getElementById('ssSubUrl').textContent=subUrl;
document.getElementById('ssClashUrl').textContent=clashUrl;
document.getElementById('ssResult').classList.remove('hidden');
}
}
}

async function loadProxyIPs(){
const d=await api('/proxyip');
if(d.success){
document.getElementById('proxyipTable').innerHTML=d.data.map(i=>\`<tr id="proxy-\${i.id}">
<td><input type="checkbox" class="proxyip-check" value="\${i.id}"></td>
<td>\${i.id}</td>
<td class="addr-cell">\${i.address}</td>
<td>\${i.remark||'-'}</td>
<td><label class="switch"><input type="checkbox" \${i.enabled?'checked':''} onchange="toggle('proxyip',\${i.id},this.checked)"><span class="slider"></span></label></td>
<td class="actions">
<button class="btn btn-warning btn-sm" onclick="editItem('proxyip',\${i.id},'\${i.address.replace(/'/g,"\\\\'")}','\${(i.remark||'').replace(/'/g,"\\\\'")}')">编辑</button>
</td></tr>\`).join('');
document.getElementById('proxyipCheckAll').checked=false;
}
}

async function loadOutbounds(){
const d=await api('/outbound');
if(d.success){
// 列表视图
document.getElementById('outboundTable').innerHTML=d.data.map(i=>{
let exitInfo='-';
if(i.exit_country||i.exit_city){
const country=i.exit_country||'';
const city=i.exit_city||'';
exitInfo=country&&city?country+'-'+city:(country||city);
if(i.checked_at){
const checkTime=new Date(i.checked_at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
exitInfo+=\` <span style="font-size:11px;color:#999">(\${checkTime})</span>\`;
}
}
return \`<tr id="outbound-\${i.id}">
<td><input type="checkbox" class="outbound-check" value="\${i.id}"></td>
<td>\${i.id}</td>
<td class="addr-cell" title="\${i.address}">\${maskAddress(i.address)}</td>
<td><span class="badge badge-info">\${i.type}</span></td>
<td id="exit-\${i.id}" style="cursor:pointer" onclick="showExitDetail(\${i.id})" title="点击查看详情">\${exitInfo}</td>
<td>\${i.remark||'-'}</td>
<td id="out-lat-\${i.id}" style="color:#999">-</td>
<td><label class="switch"><input type="checkbox" \${i.enabled?'checked':''} onchange="toggle('outbound',\${i.id},this.checked)"><span class="slider"></span></label></td>
<td class="actions">
<button class="btn btn-success btn-sm" onclick="testSingleOutbound(\${i.id})">测速</button>
<button class="btn btn-warning btn-sm" onclick="editItem('outbound',\${i.id},'\${i.address.replace(/'/g,"\\\\'")}','\${(i.remark||'').replace(/'/g,"\\\\'")}')">编辑</button>
</td></tr>\`;
}).join('');
document.getElementById('outboundCheckAll').checked=false;

// 卡片视图
document.getElementById('outboundCardView').innerHTML=d.data.map(i=>{
let exitInfo='未检测';
let exitClass='unknown';
if(i.exit_country||i.exit_city){
const country=i.exit_country||'';
const city=i.exit_city||'';
exitInfo=country&&city?country+'-'+city:(country||city);
exitClass='online';
}
const statusClass=i.enabled?'online':'offline';
const statusText=i.enabled?'已启用':'已禁用';
return \`<div class="outbound-card \${statusClass}" id="outbound-card-\${i.id}">
<input type="checkbox" class="card-checkbox outbound-check" value="\${i.id}">
<div class="card-header">
<div style="flex:1;padding-right:30px">
<div class="card-title">\${i.remark||'节点-'+i.id}</div>
<div class="card-status">
<span class="status-dot \${statusClass}"></span>
<span>\${statusText}</span>
<span class="badge badge-info" style="margin-left:4px">\${i.type}</span>
</div>
</div>
</div>
<div class="card-info">
<div class="card-info-row">
<span>地址:</span>
<span style="word-break:break-all;text-align:right">\${maskAddress(i.address)}</span>
</div>
<div class="card-info-row" style="cursor:pointer" onclick="showExitDetail(\${i.id})" title="点击查看详情">
<span>出站:</span>
<span id="exit-card-\${i.id}">\${exitInfo}</span>
</div>
</div>
<div class="card-latency unknown" id="out-lat-card-\${i.id}">未测速</div>
<div class="card-actions">
<button class="btn btn-success btn-sm" onclick="testSingleOutbound(\${i.id})">测速</button>
<button class="btn btn-warning btn-sm" onclick="editItem('outbound',\${i.id},'\${i.address.replace(/'/g,"\\\\'")}','\${(i.remark||'').replace(/'/g,"\\\\'")}')">编辑</button>
<label class="switch" style="margin:0">
<input type="checkbox" \${i.enabled?'checked':''} onchange="toggle('outbound',\${i.id},this.checked)">
<span class="slider"></span>
</label>
</div>
</div>\`;
}).join('');

// 根据当前视图模式显示对应的视图
if(outboundViewMode==='card'){
document.getElementById('outboundListView').classList.add('hidden');
document.getElementById('outboundCardView').classList.remove('hidden');
document.getElementById('toggleViewBtn').textContent='📋 切换列表';
}else{
document.getElementById('outboundListView').classList.remove('hidden');
document.getElementById('outboundCardView').classList.add('hidden');
document.getElementById('toggleViewBtn').textContent='📋 切换卡片';
}
}
}

async function loadCFIPs(){
const d=await api('/cfip');
if(d.success){
document.getElementById('cfipTable').innerHTML=d.data.map(i=>\`<tr>
<td><input type="checkbox" class="cfip-check" value="\${i.id}"></td>
<td>\${i.id}</td>
<td>\${i.address}</td>
<td>\${i.port}</td>
<td>\${i.remark||'-'}</td>
<td><label class="switch"><input type="checkbox" \${i.enabled?'checked':''} onchange="toggle('cfip',\${i.id},this.checked)"><span class="slider"></span></label></td>
<td class="actions">
<button class="btn btn-warning btn-sm" onclick="editItem('cfip',\${i.id},'\${i.address.replace(/'/g,"\\\\'")}','\${(i.remark||'').replace(/'/g,"\\\\'")}',\${i.port})">编辑</button>
</td></tr>\`).join('');
document.getElementById('cfipCheckAll').checked=false;
}
}

async function testSingleSocks5(id){
const latCell=document.getElementById('lat-'+id);
if(!latCell)return;
latCell.textContent='测试中...';
latCell.style.color='#999';
try{
const d=await api('/test-socks5','POST',{id});
console.log('单个测速结果:',d);
if(d.success&&d.results&&d.results.length>0){
const result=d.results[0];
if(result.status==='online'){
latCell.textContent=result.latency+'ms';
latCell.style.color=result.latency<200?'#48c774':result.latency<500?'#ffdd57':'#f14668';
}else{
latCell.textContent='离线';
latCell.style.color='#f14668';
latCell.title=result.error||'连接失败';
console.error('SOCKS5离线:',result);
}
}else{
latCell.textContent='失败';
latCell.style.color='#f14668';
console.error('API返回错误:',d);
}
}catch(e){
latCell.textContent='错误';
latCell.style.color='#f14668';
console.error('测速异常:',e);
}
}

async function testAllSocks5(){
const rows=document.querySelectorAll('[id^="proxy-"]');
const socks5Rows=Array.from(rows).filter(row=>{
const badge=row.querySelector('.badge-info');
return badge&&badge.textContent==='socks5';
});
if(socks5Rows.length===0)return alert('没有 SOCKS5 类型的 ProxyIP');
socks5Rows.forEach(row=>{
const latCell=row.querySelector('[id^="lat-"]');
if(latCell){
latCell.textContent='等待...';
latCell.style.color='#999';
}
});
try{
const d=await api('/test-socks5','POST',{});
console.log('批量测速结果:',d);
if(d.success&&d.results){
d.results.forEach(result=>{
const latCell=document.getElementById('lat-'+result.id);
if(latCell){
if(result.status==='online'){
latCell.textContent=result.latency+'ms';
latCell.style.color=result.latency<200?'#48c774':result.latency<500?'#ffdd57':'#f14668';
}else{
latCell.textContent='离线';
latCell.style.color='#f14668';
latCell.title=result.error||'连接失败';
console.error('ProxyIP '+result.id+' 离线:',result.error);
}
}
});
}
}catch(e){
alert('测速失败: '+e.message);
console.error('批量测速异常:',e);
}
}

async function testSingleOutbound(id){
const latCell=document.getElementById('out-lat-'+id);
const latCardCell=document.getElementById('out-lat-card-'+id);
const card=document.getElementById('outbound-card-'+id);
if(!latCell&&!latCardCell)return;

// 更新列表视图
if(latCell){
latCell.innerHTML='<span style="display:inline-block;width:12px;height:12px;border:2px solid #667eea;border-top:2px solid transparent;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
latCell.style.color='#667eea';
}
// 更新卡片视图
if(latCardCell){
latCardCell.innerHTML='<span style="display:inline-block;width:16px;height:16px;border:3px solid #667eea;border-top:3px solid transparent;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
latCardCell.className='card-latency unknown';
}

try{
const d=await api('/test-outbound','POST',{id});
if(d.success&&d.results&&d.results.length>0){
const result=d.results[0];
if(result.status==='online'){
const latency=result.latency;
const color=latency<200?'#48c774':latency<500?'#ffdd57':'#f14668';
const cardClass=latency<200?'good':latency<500?'medium':'bad';
// 更新列表视图
if(latCell){
latCell.textContent=latency+'ms';
latCell.style.color=color;
}
// 更新卡片视图
if(latCardCell){
latCardCell.textContent=latency+'ms';
latCardCell.className='card-latency '+cardClass;
}
// 更新卡片边框颜色为绿色（通）
if(card){
card.className=card.className.replace(/tested-\w+/g,'').trim()+' tested-online';
}
}else{
// 更新列表视图
if(latCell){
latCell.textContent='离线';
latCell.style.color='#f14668';
latCell.title=result.error||'连接失败';
}
// 更新卡片视图
if(latCardCell){
latCardCell.textContent='离线';
latCardCell.className='card-latency bad';
}
// 更新卡片边框颜色为红色（不通）
if(card){
card.className=card.className.replace(/tested-\w+/g,'').trim()+' tested-offline';
}
}
}else{
if(latCell){
latCell.textContent='失败';
latCell.style.color='#f14668';
}
if(latCardCell){
latCardCell.textContent='失败';
latCardCell.className='card-latency bad';
}
// 更新卡片边框颜色为红色（不通）
if(card){
card.className=card.className.replace(/tested-\w+/g,'').trim()+' tested-offline';
}
}
}catch(e){
if(latCell){
latCell.textContent='错误';
latCell.style.color='#f14668';
}
if(latCardCell){
latCardCell.textContent='错误';
latCardCell.className='card-latency bad';
}
// 更新卡片边框颜色为红色（不通）
if(card){
card.className=card.className.replace(/tested-\w+/g,'').trim()+' tested-offline';
}
}
}

async function testAllOutbounds(){
const rows=document.querySelectorAll('[id^="outbound-"]');
const cards=document.querySelectorAll('[id^="outbound-card-"]');
if(rows.length===0&&cards.length===0)return alert('没有出站代理');

// 更新列表视图的加载状态
rows.forEach(row=>{
const latCell=row.querySelector('[id^="out-lat-"]');
if(latCell){
latCell.innerHTML='<span style="display:inline-block;width:12px;height:12px;border:2px solid #667eea;border-top:2px solid transparent;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
latCell.style.color='#667eea';
}
});

// 更新卡片视图的加载状态
cards.forEach(card=>{
const latCell=card.querySelector('[id^="out-lat-card-"]');
if(latCell){
latCell.innerHTML='<span style="display:inline-block;width:16px;height:16px;border:3px solid #667eea;border-top:3px solid transparent;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
latCell.className='card-latency unknown';
}
});

try{
const d=await api('/test-outbound','POST',{});
if(d.success&&d.results){
d.results.forEach(result=>{
const latCell=document.getElementById('out-lat-'+result.id);
const latCardCell=document.getElementById('out-lat-card-'+result.id);
const card=document.getElementById('outbound-card-'+result.id);
const latency=result.latency;
const color=latency<200?'#48c774':latency<500?'#ffdd57':'#f14668';
const cardClass=latency<200?'good':latency<500?'medium':'bad';

if(result.status==='online'){
// 更新列表视图
if(latCell){
latCell.textContent=latency+'ms';
latCell.style.color=color;
}
// 更新卡片视图
if(latCardCell){
latCardCell.textContent=latency+'ms';
latCardCell.className='card-latency '+cardClass;
}
// 更新卡片边框颜色为绿色（通）
if(card){
card.className=card.className.replace(/tested-\w+/g,'').trim()+' tested-online';
}
}else{
// 更新列表视图
if(latCell){
latCell.textContent='离线';
latCell.style.color='#f14668';
latCell.title=result.error||'连接失败';
}
// 更新卡片视图
if(latCardCell){
latCardCell.textContent='离线';
latCardCell.className='card-latency bad';
}
// 更新卡片边框颜色为红色（不通）
if(card){
card.className=card.className.replace(/tested-\w+/g,'').trim()+' tested-offline';
}
}
});
}
}catch(e){
alert('测速失败: '+e.message);
// 恢复所有延迟显示
rows.forEach(row=>{
const latCell=row.querySelector('[id^="out-lat-"]');
if(latCell&&latCell.innerHTML.includes('spin')){
latCell.textContent='-';
latCell.style.color='#999';
}
});
cards.forEach(card=>{
const latCell=card.querySelector('[id^="out-lat-card-"]');
if(latCell&&latCell.innerHTML.includes('spin')){
latCell.textContent='未测速';
latCell.className='card-latency unknown';
}
});
}
}

async function toggle(type,id,enabled){
showLoading();
try{
await api('/'+type+'/'+id,'PUT',{enabled});
if(type==='proxyip')await loadProxyIPs();
else if(type==='outbound')await loadOutbounds();
else await loadCFIPs();
}finally{
hideLoading();
}
}

async function del(type,id){
if(!confirm('确定删除?'))return;
showLoading();
try{
await api('/'+type+'/'+id,'DELETE');
if(type==='proxyip')await loadProxyIPs();
else if(type==='outbound')await loadOutbounds();
else await loadCFIPs();
}finally{
hideLoading();
}
}

function showModal(type,id=null,addr='',remark='',port=443){
modalType=type;
editId=id;
const isEdit=id!==null;
const titles={'proxyip':'ProxyIP','outbound':'全局出站','cfip':'CFIP'};
document.getElementById('modalTitle').textContent=(isEdit?'编辑':'添加')+titles[type];
if(type==='proxyip'){
document.getElementById('modalBody').innerHTML=\`<div class="form-group"><label>地址</label><input type="text" id="mAddr" value="\${addr}" placeholder="IP/域名"></div>
<div class="form-group"><label>备注</label><input type="text" id="mRemark" value="\${remark}"></div>\`;
}else if(type==='outbound'){
document.getElementById('modalBody').innerHTML=\`<div class="form-group"><label>地址</label><input type="text" id="mAddr" value="\${addr}" placeholder="socks5://host:port 或 http://host:port"></div>
<div class="form-group"><label>备注</label><input type="text" id="mRemark" value="\${remark}"></div>\`;
}else{
document.getElementById('modalBody').innerHTML=\`<div class="form-group"><label>地址</label><input type="text" id="mAddr" value="\${addr}" placeholder="优选域名或IP"></div>
<div class="form-group"><label>端口</label><input type="number" id="mPort" value="\${port}"></div>
<div class="form-group"><label>备注</label><input type="text" id="mRemark" value="\${remark}"></div>\`;
}
document.getElementById('addModal').classList.remove('hidden');
}

function editItem(type,id,addr,remark,port){
showModal(type,id,addr,remark,port||443);
}

function closeModal(){document.getElementById('addModal').classList.add('hidden');editId=null}

async function submitModal(){
const addr=document.getElementById('mAddr').value.trim();
const remark=document.getElementById('mRemark').value.trim();
if(!addr)return alert('请输入地址');

let body={address:addr,remark:remark||undefined};
if(modalType==='cfip')body.port=parseInt(document.getElementById('mPort').value)||443;

const method=editId?'PUT':'POST';
const path=editId?'/'+modalType+'/'+editId:'/'+modalType;

showLoading();
try{
const d=await api(path,method,body);
if(d.success){
closeModal();
if(modalType==='proxyip')await loadProxyIPs();
else if(modalType==='outbound')await loadOutbounds();
else await loadCFIPs();
}else{
alert(d.error||'操作失败');
}
}finally{
hideLoading();
}
}

async function generateVless(){
const uuid=document.getElementById('vlessUuidInput').value.trim();
const domain=document.getElementById('vlessDomainInput').value.trim();
let path=document.getElementById('vlessPathInput').value.trim();
if(!path)path='/?ed=2560';
if(!uuid||!domain)return alert('请填写UUID和域名');

showLoading();
try{
const d=await api('/subscribe/vless/generate','POST',{uuid,snippetsDomain:domain,proxyPath:path});
if(d.success){
const subUrl=location.origin+'/sub/'+uuid;
const clashUrl='https://sublink.eooce.com/clash?config='+encodeURIComponent(subUrl);
document.getElementById('vlessSubUrl').textContent=subUrl;
document.getElementById('vlessClashUrl').textContent=clashUrl;
document.getElementById('vlessResult').classList.remove('hidden');
document.getElementById('vlessAlert').innerHTML='<div class="alert alert-success">保存成功，共'+d.data.count+'条节点</div>';
}else{document.getElementById('vlessAlert').innerHTML='<div class="alert alert-error">'+d.error+'</div>'}
}finally{
hideLoading();
}
}

async function generateSS(){
const password=document.getElementById('ssPasswordInput').value.trim();
const domain=document.getElementById('ssDomainInput').value.trim();
let path=document.getElementById('ssPathInput').value.trim();
if(!path)path='/'+password;
if(!password||!domain)return alert('请填写密码和域名');

showLoading();
try{
const d=await api('/subscribe/ss/generate','POST',{password,snippetsDomain:domain,proxyPath:path});
if(d.success){
const subUrl=location.origin+'/sub/ss/'+password;
const clashUrl='https://sublink.eooce.com/clash?config='+encodeURIComponent(subUrl);
document.getElementById('ssSubUrl').textContent=subUrl;
document.getElementById('ssClashUrl').textContent=clashUrl;
document.getElementById('ssResult').classList.remove('hidden');
document.getElementById('ssAlert').innerHTML='<div class="alert alert-success">保存成功，共'+d.data.count+'条节点</div>';
}else{document.getElementById('ssAlert').innerHTML='<div class="alert alert-error">'+d.error+'</div>'}
}finally{
hideLoading();
}
}

function copy(id){navigator.clipboard.writeText(document.getElementById(id).textContent).then(()=>alert('已复制'))}

function closeExitDetail(){document.getElementById('exitDetailModal').classList.add('hidden')}

async function showExitDetail(id){
showLoading();
try{
const d=await api('/outbound');
if(!d.success)return;
const outbound=d.data.find(i=>i.id===id);
if(!outbound||(!outbound.entry_info_json&&!outbound.exit_info_json)){
alert('暂无出入站信息，请先进行检测');
return;
}
const entryInfo=outbound.entry_info_json?JSON.parse(outbound.entry_info_json):null;
const exitInfo=outbound.exit_info_json?JSON.parse(outbound.exit_info_json):null;

// 辅助函数：显示是/否标签
const yesNo=(val)=>val?'<span style="background:#48c774;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px">否</span>':'<span style="background:#f14668;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px">是</span>';
// 辅助函数：显示百分比标签
const percent=(val)=>{
const v=parseFloat(val)||0;
const color=v<10?'#48c774':v<30?'#ffdd57':'#f14668';
return \`<span style="background:\${color};color:\${v<30?'#333':'#fff'};padding:3px 10px;border-radius:4px;font-size:12px;font-weight:bold">\${v.toFixed(2)}%</span>\`;
};

const html=\`
<div style="display:flex;gap:20px">
<div style="flex:1;background:#e8f5e9;padding:20px;border-radius:8px">
<h3 style="color:#2e7d32;margin:0 0 16px 0;text-align:center;font-size:18px">入口信息</h3>
<div style="line-height:2.4;font-size:14px">
<p><strong>IP地址：</strong>\${entryInfo?.ip||'-'}</p>
<p><strong>网络爬虫：</strong>\${entryInfo?.is_crawler!==undefined?yesNo(entryInfo.is_crawler):'-'}</p>
<p><strong>数据中心：</strong>\${entryInfo?.is_datacenter!==undefined?yesNo(entryInfo.is_datacenter):'-'}</p>
<p><strong>Tor网络：</strong>\${entryInfo?.is_tor!==undefined?yesNo(entryInfo.is_tor):'-'}</p>
<p><strong>代理：</strong>\${entryInfo?.is_proxy!==undefined?yesNo(entryInfo.is_proxy):'-'}</p>
<p><strong>VPN：</strong>\${entryInfo?.is_vpn!==undefined?yesNo(entryInfo.is_vpn):'-'}</p>
<p><strong>滥用行为：</strong>\${entryInfo?.is_abuser!==undefined?yesNo(entryInfo.is_abuser):'-'}</p>
<p><strong>滥用风险评分：</strong>\${entryInfo?.abuse_score!==undefined?percent(entryInfo.abuse_score):'-'}</p>
<p><strong>自治系统编号：</strong>\${entryInfo?.asn?.asn?'AS'+entryInfo.asn.asn:'-'}</p>
<p><strong>所属组织：</strong>\${entryInfo?.asn?.org||'-'}</p>
<p><strong>国家：</strong>\${entryInfo?.location?.country||'-'}</p>
<p><strong>城市：</strong>\${entryInfo?.location?.city||'-'}</p>
</div>
</div>
<div style="flex:1;background:#e3f2fd;padding:20px;border-radius:8px">
<h3 style="color:#1976d2;margin:0 0 16px 0;text-align:center;font-size:18px">出口信息</h3>
<div style="line-height:2.4;font-size:14px">
<p><strong>IP地址：</strong>\${exitInfo?.ip||'-'}</p>
<p><strong>网络爬虫：</strong>\${exitInfo?.is_crawler!==undefined?yesNo(exitInfo.is_crawler):'-'}</p>
<p><strong>数据中心：</strong>\${exitInfo?.is_datacenter!==undefined?yesNo(exitInfo.is_datacenter):'-'}</p>
<p><strong>Tor网络：</strong>\${exitInfo?.is_tor!==undefined?yesNo(exitInfo.is_tor):'-'}</p>
<p><strong>代理：</strong>\${exitInfo?.is_proxy!==undefined?yesNo(exitInfo.is_proxy):'-'}</p>
<p><strong>VPN：</strong>\${exitInfo?.is_vpn!==undefined?yesNo(exitInfo.is_vpn):'-'}</p>
<p><strong>滥用行为：</strong>\${exitInfo?.is_abuser!==undefined?yesNo(exitInfo.is_abuser):'-'}</p>
<p><strong>滥用风险评分：</strong>\${exitInfo?.abuse_score!==undefined?percent(exitInfo.abuse_score):'-'}</p>
<p><strong>自治系统编号：</strong>\${exitInfo?.asn?.asn?'AS'+exitInfo.asn.asn:'-'}</p>
<p><strong>所属组织：</strong>\${exitInfo?.asn?.org||'-'}</p>
<p><strong>国家：</strong>\${exitInfo?.location?.country||'-'}</p>
<p><strong>城市：</strong>\${exitInfo?.location?.city||'-'}</p>
</div>
</div>
</div>
<div style="text-align:center;margin-top:16px;color:#999;font-size:13px">
检测时间：\${outbound.checked_at?new Date(outbound.checked_at).toLocaleString('zh-CN'):'-'}
</div>
\`;
document.getElementById('exitDetailBody').innerHTML=html;
document.getElementById('exitDetailModal').classList.remove('hidden');
}finally{
hideLoading();
}
}

async function checkSingleExit(id){
const exitCell=document.getElementById('exit-'+id);
if(!exitCell)return;
exitCell.innerHTML='<span style="display:inline-block;width:12px;height:12px;border:2px solid #667eea;border-top:2px solid transparent;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
try{
const d=await api('/check-exit','POST',{id});
console.log('检测结果:',d);
if(d.success&&d.results&&d.results.length>0){
const result=d.results[0];
console.log('单个结果:',result);
if(result.success){
const country=result.country||'';
const city=result.city||'';
const exitInfo=country&&city?country+'-'+city:(country||city||'未知');
const checkTime=new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
exitCell.innerHTML=\`\${exitInfo} <span style="font-size:11px;color:#999">(\${checkTime})</span>\`;
exitCell.style.cursor='pointer';
}else{
exitCell.textContent='检测失败';
exitCell.style.color='#f14668';
exitCell.title=result.error||'未知错误';
console.error('检测失败:',result.error);
}
}else{
exitCell.textContent='检测失败';
exitCell.style.color='#f14668';
console.error('API返回错误:',d);
}
}catch(e){
exitCell.textContent='错误';
exitCell.style.color='#f14668';
console.error('检测异常:',e);
}
}

async function checkAllExits(){
// 获取所有勾选的checkbox
const checkedBoxes=document.querySelectorAll('.outbound-check:checked');
if(checkedBoxes.length===0)return alert('请先勾选要检测的出站代理');

const ids=Array.from(checkedBoxes).map(cb=>parseInt(cb.value));

// 更新加载状态
ids.forEach(id=>{
const exitCell=document.getElementById('exit-'+id);
const exitCardCell=document.getElementById('exit-card-'+id);
if(exitCell){
exitCell.innerHTML='<span style="display:inline-block;width:12px;height:12px;border:2px solid #667eea;border-top:2px solid transparent;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
}
if(exitCardCell){
exitCardCell.innerHTML='<span style="display:inline-block;width:12px;height:12px;border:2px solid #667eea;border-top:2px solid transparent;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
}
});

try{
const d=await api('/check-exit','POST',{ids});
if(d.success&&d.results){
d.results.forEach(result=>{
const exitCell=document.getElementById('exit-'+result.id);
const exitCardCell=document.getElementById('exit-card-'+result.id);
if(result.success){
const country=result.country||'';
const city=result.city||'';
const exitInfo=country&&city?country+'-'+city:(country||city||'未知');
const checkTime=new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
// 更新列表视图
if(exitCell){
exitCell.innerHTML=\`\${exitInfo} <span style="font-size:11px;color:#999">(\${checkTime})</span>\`;
exitCell.style.cursor='pointer';
}
// 更新卡片视图
if(exitCardCell){
exitCardCell.textContent=exitInfo;
}
}else{
// 更新列表视图
if(exitCell){
exitCell.textContent='检测失败';
exitCell.style.color='#f14668';
}
// 更新卡片视图
if(exitCardCell){
exitCardCell.textContent='检测失败';
exitCardCell.style.color='#f14668';
}
}
});
}
}catch(e){
alert('检测失败: '+e.message);
ids.forEach(id=>{
const exitCell=document.getElementById('exit-'+id);
const exitCardCell=document.getElementById('exit-card-'+id);
if(exitCell&&exitCell.innerHTML.includes('spin')){
exitCell.textContent='-';
exitCell.style.color='#999';
}
if(exitCardCell&&exitCardCell.innerHTML.includes('spin')){
exitCardCell.textContent='未检测';
exitCardCell.style.color='#999';
}
});
}
}

function checkAll(type,checked){
const className=type==='proxyip'?'proxyip-check':type==='outbound'?'outbound-check':'cfip-check';
document.querySelectorAll('.'+className).forEach(cb=>cb.checked=checked);
}

let batchType='';
function showBatchModal(type){
batchType=type;
const titles={'proxyip':'ProxyIP','outbound':'全局出站','cfip':'CFIP'};
document.getElementById('batchModalTitle').textContent='批量添加 '+titles[type];
document.getElementById('batchInput').value='';
document.getElementById('batchAlert').innerHTML='';
if(type==='proxyip'){
document.getElementById('batchHelp').innerHTML='<b>格式说明：</b>每行一条，支持以下格式：<br>• IP/域名#备注<br>备注可选，没有备注则自动生成';
}else if(type==='outbound'){
document.getElementById('batchHelp').innerHTML='<b>格式说明：</b>每行一条，支持以下格式：<br>• socks5://host:port#备注<br>• socks5://user:pass@host:port#备注<br>• http://host:port#备注<br>• http://user:pass@host:port#备注<br>备注可选，没有备注则自动生成';
}else{
document.getElementById('batchHelp').innerHTML='<b>格式说明：</b>每行一条，格式为：<br>• IP/域名:端口#备注<br>• IP/域名#备注（端口默认443）<br>备注可选，没有备注则自动生成';
}
document.getElementById('batchModal').classList.remove('hidden');
}

function closeBatchModal(){
document.getElementById('batchModal').classList.add('hidden');
batchType='';
}

async function exportData(){
showLoading();
try{
const [proxyips,outbounds,cfips,vlessConfig,ssConfig]=await Promise.all([
api('/proxyip'),
api('/outbound'),
api('/cfip'),
api('/subscribe/vless/config'),
api('/subscribe/ss/config')
]);
const exportData={
version:'1.0',
timestamp:new Date().toISOString(),
proxyips:proxyips.success?proxyips.data:[],
outbounds:outbounds.success?outbounds.data:[],
cfips:cfips.success?cfips.data:[],
vlessConfig:vlessConfig.success?vlessConfig.data:{},
ssConfig:ssConfig.success?ssConfig.data:{}
};
const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;
a.download=\`cf-snippets-extend-\${new Date().toISOString().split('T')[0]}.json\`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
alert('导出成功');
}catch(e){
alert('导出失败: '+e.message);
}finally{
hideLoading();
}
}

function importData(){
// 直接显示模式选择模态框
document.getElementById('importModeModal').classList.remove('hidden');
}

let importFileData=null;
let importMode='append';

function closeImportModeModal(){
document.getElementById('importModeModal').classList.add('hidden');
document.getElementById('importFileInput').value='';
importFileData=null;
}

async function confirmImportMode(mode){
importMode=mode;
closeImportModeModal();
// 选择模式后，触发文件选择
document.getElementById('importFileInput').click();
}

function handleImportFileSelect(event){
const file=event.target.files[0];
if(!file)return;

if(importMode==='replace'){
if(!confirm('警告：完全覆盖导入将删除所有现有数据！\\n\\n此操作不可撤销，确定继续吗？')){
event.target.value='';
return;
}
}

showLoading();
file.text().then(text=>{
try{
const data=JSON.parse(text);
if(!data.version||!data.proxyips||!data.outbounds||!data.cfips){
throw new Error('无效的导入文件格式');
}
executeImport(data,importMode);
}catch(e){
hideLoading();
alert('文件格式错误: '+e.message);
event.target.value='';
}
}).catch(e=>{
hideLoading();
alert('读取文件失败: '+e.message);
event.target.value='';
});
}

async function executeImport(data,mode){
showLoading();
try{
if(mode==='replace'){
// 完全覆盖模式：先删除所有现有数据
const [existingProxyips,existingOutbounds,existingCfips]=await Promise.all([
api('/proxyip'),
api('/outbound'),
api('/cfip')
]);

const deletePromises=[];
if(existingProxyips.success){
deletePromises.push(...existingProxyips.data.map(item=>api('/proxyip/'+item.id,'DELETE')));
}
if(existingOutbounds.success){
deletePromises.push(...existingOutbounds.data.map(item=>api('/outbound/'+item.id,'DELETE')));
}
if(existingCfips.success){
deletePromises.push(...existingCfips.data.map(item=>api('/cfip/'+item.id,'DELETE')));
}
await Promise.all(deletePromises);
}

// 导入新数据（两种模式都执行）
const results=await Promise.all([
...data.proxyips.map(item=>api('/proxyip','POST',{address:item.address,remark:item.remark,enabled:item.enabled})),
...data.outbounds.map(item=>api('/outbound','POST',{address:item.address,remark:item.remark,enabled:item.enabled})),
...data.cfips.map(item=>api('/cfip','POST',{address:item.address,port:item.port,remark:item.remark,enabled:item.enabled}))
]);

// 更新 VLESS 配置
if(data.vlessConfig&&data.vlessConfig.uuid){
await api('/subscribe/vless/generate','POST',{uuid:data.vlessConfig.uuid,snippetsDomain:data.vlessConfig.snippets_domain,proxyPath:data.vlessConfig.proxy_path});
}

// 更新 SS 配置
if(data.ssConfig&&data.ssConfig.password){
await api('/subscribe/ss/generate','POST',{password:data.ssConfig.password,snippetsDomain:data.ssConfig.snippets_domain,proxyPath:data.ssConfig.proxy_path});
}

// 兼容旧版本导出格式（config 字段）
if(data.config&&data.config.uuid&&!data.vlessConfig){
await api('/subscribe/vless/generate','POST',{uuid:data.config.uuid,snippetsDomain:data.config.snippets_domain,proxyPath:data.config.proxy_path});
}

await load();
const modeText=mode==='replace'?'覆盖导入':'新增导入';
alert(modeText+'成功！');
}catch(e){
alert('导入失败: '+e.message);
}finally{
hideLoading();
document.getElementById('importFileInput').value='';
}
}


async function submitBatch(){
const input=document.getElementById('batchInput').value.trim();
if(!input)return alert('请输入数据');

const lines=input.split('\\n').filter(l=>l.trim());
if(lines.length===0)return alert('没有有效数据');

const items=[];
const errors=[];

for(let i=0;i<lines.length;i++){
const line=lines[i].trim();
const lineNum=i+1;

try{
if(batchType==='proxyip'){
// ProxyIP 格式：地址#备注（不允许 socks5/http）
const parts=line.split('#');
const address=parts[0].trim();
const remark=parts[1]?parts[1].trim():'';
if(!address)throw new Error('地址不能为空');
if(address.startsWith('socks')||address.startsWith('http'))throw new Error('SOCKS5/HTTP 请添加到全局出站');
items.push({address,remark:remark||undefined});
}else if(batchType==='outbound'){
// Outbound 格式：socks5://... 或 http://...#备注
const parts=line.split('#');
const address=parts[0].trim();
const remark=parts[1]?parts[1].trim():'';
if(!address)throw new Error('地址不能为空');
if(!address.startsWith('socks')&&!address.startsWith('http'))throw new Error('必须是 socks5:// 或 http:// 格式');
items.push({address,remark:remark||undefined});
}else{
// CFIP 格式：地址:端口#备注
const parts=line.split('#');
const addrPart=parts[0].trim();
const remark=parts[1]?parts[1].trim():'';
if(!addrPart)throw new Error('地址不能为空');

let address,port=443;
if(addrPart.includes(':')){
const ap=addrPart.split(':');
address=ap[0].trim();
port=parseInt(ap[1])||443;
}else{
address=addrPart;
}
items.push({address,port,remark:remark||undefined});
}
}catch(e){
errors.push(\`第\${lineNum}行: \${e.message}\`);
}
}

if(errors.length>0){
document.getElementById('batchAlert').innerHTML='<div class="alert alert-error">'+errors.join('<br>')+'</div>';
return;
}

// 批量添加
showLoading();
let success=0,failed=0;
for(const item of items){
try{
const d=await api('/'+batchType,'POST',item);
if(d.success)success++;else failed++;
}catch(e){
failed++;
}
}
hideLoading();

document.getElementById('batchAlert').innerHTML=\`<div class="alert alert-success">成功添加 \${success} 条\${failed>0?'，失败 '+failed+' 条':''}</div>\`;
if(batchType==='proxyip')await loadProxyIPs();
else if(batchType==='outbound')await loadOutbounds();
else await loadCFIPs();

if(failed===0){
setTimeout(()=>closeBatchModal(),1500);
}
}

async function batchEnable(type,enabled){
const className=type==='proxyip'?'proxyip-check':type==='outbound'?'outbound-check':'cfip-check';
const checks=document.querySelectorAll('.'+className+':checked');
if(checks.length===0)return alert('请先选择要修改的项');

if(!confirm(\`确定\${enabled?'启用':'禁用'}选中的 \${checks.length} 项？\`))return;

showLoading();
let success=0,failed=0;
for(const cb of checks){
try{
const d=await api('/'+type+'/'+cb.value,'PUT',{enabled});
if(d.success)success++;else failed++;
}catch(e){
failed++;
}
}
hideLoading();

alert(\`操作完成：成功 \${success} 条\${failed>0?'，失败 '+failed+' 条':''}\`);
if(type==='proxyip')await loadProxyIPs();
else if(type==='outbound')await loadOutbounds();
else await loadCFIPs();
}

async function batchDelete(type){
const className=type==='proxyip'?'proxyip-check':type==='outbound'?'outbound-check':'cfip-check';
const checks=document.querySelectorAll('.'+className+':checked');
if(checks.length===0)return alert('请先选择要删除的项');

if(!confirm(\`确定删除选中的 \${checks.length} 项？\`))return;

showLoading();
let success=0,failed=0;
for(const cb of checks){
try{
const d=await api('/'+type+'/'+cb.value,'DELETE');
if(d.success)success++;else failed++;
}catch(e){
failed++;
}
}
hideLoading();

alert(\`删除完成：成功 \${success} 条\${failed>0?'，失败 '+failed+' 条':''}\`);
if(type==='proxyip')await loadProxyIPs();
else if(type==='outbound')await loadOutbounds();
else await loadCFIPs();
}
</script>
</body>
</html>`;


const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

// 自动初始化数据库
async function initDB(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, api_key TEXT UNIQUE, expires_at TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS proxy_ips (id INTEGER PRIMARY KEY, address TEXT, type TEXT, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS outbounds (id INTEGER PRIMARY KEY, address TEXT, type TEXT, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, exit_country TEXT, exit_city TEXT, exit_ip TEXT, exit_org TEXT, checked_at TEXT, created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS cf_ips (id INTEGER PRIMARY KEY, address TEXT, port INTEGER DEFAULT 443, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS subscribe_config (id INTEGER PRIMARY KEY, uuid TEXT, snippets_domain TEXT, proxy_path TEXT, updated_at TEXT);
    `).catch(() => {});
    
    // 为已存在的 outbounds 表添加新列（如果不存在）
    try {
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_country TEXT`).run().catch(() => {});
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_city TEXT`).run().catch(() => {});
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_ip TEXT`).run().catch(() => {});
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_org TEXT`).run().catch(() => {});
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_asn TEXT`).run().catch(() => {});
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN checked_at TEXT`).run().catch(() => {});
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN entry_info_json TEXT`).run().catch(() => {});
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_info_json TEXT`).run().catch(() => {});
    } catch (e) {
        // 列可能已存在，忽略错误
    }
    
    // 迁移 proxy_ips 中的 socks5 和 http 数据到 outbounds
    try {
        const { results: socks5Data } = await db.prepare("SELECT * FROM proxy_ips WHERE type IN ('socks5', 'http', 'https')").all();
        if (socks5Data && socks5Data.length > 0) {
            for (const item of socks5Data) {
                // 插入到 outbounds
                await db.prepare('INSERT OR IGNORE INTO outbounds (address, type, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    .bind(item.address, item.type, item.remark, item.enabled, item.sort_order, item.created_at, item.updated_at).run();
            }
            // 删除已迁移的数据
            await db.prepare("DELETE FROM proxy_ips WHERE type IN ('socks5', 'http', 'https')").run();
        }
    } catch (e) {
        console.error('Migration error:', e);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

function parseProxyType(addr) {
    if (!addr) return 'unknown';
    if (addr.startsWith('socks')) return 'socks5';
    if (addr.startsWith('http://')) return 'http';
    if (addr.startsWith('https://')) return 'https';
    if (addr.startsWith('[') || addr.includes('::')) return 'ipv6';
    if (/^(\d{1,3}\.){3}\d{1,3}/.test(addr)) return 'ipv4';
    return 'domain';
}

function parseOutboundType(addr) {
    if (!addr) return 'unknown';
    if (addr.startsWith('socks')) return 'socks5';
    if (addr.startsWith('http://') || addr.startsWith('https://')) return 'http';
    return 'unknown';
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') return new Response(null, { headers: CORS });

        await initDB(env.DB);

        // 路由
        // 公开订阅
        if (path.startsWith('/sub/')) {
            const parts = path.split('/');
            if (parts[2] === 'ss' && parts[3]) {
                // SS 订阅: /sub/ss/password
                return handleSSSubscribe(env.DB, parts[3]);
            } else if (parts[2]) {
                // VLESS 订阅: /sub/uuid
                return handleSubscribe(env.DB, parts[2]);
            }
        }

        // 静态页面
        if (path === '/' || path === '/index.html') {
            return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 登录接口
        if (path === '/api/auth/login' && method === 'POST') {
            return handleLogin(request, env);
        }

        // 内部 API - 使用 env.API_KEY 直接验证（供其他 Worker 调用）
        if (path === '/api/internal/cfip' && method === 'GET') {
            const internalKey = request.headers.get('X-Internal-Key') || url.searchParams.get('key');
            if (internalKey === env.API_KEY) {
                return handleGetCFIPs(env.DB);
            }
            return json({ error: 'Invalid Internal Key' }, 401);
        }

        // 需要认证的 API
        const apiKey = request.headers.get('X-API-Key') || url.searchParams.get('apikey');
        if (!apiKey) return json({ error: 'Missing API Key' }, 401);

        const session = await env.DB.prepare('SELECT * FROM sessions WHERE api_key = ? AND expires_at > datetime("now")').bind(apiKey).first();
        if (!session) return json({ error: 'Invalid API Key' }, 401);

        // ProxyIP
        if (path === '/api/proxyip') {
            if (method === 'GET') return handleGetProxyIPs(env.DB);
            if (method === 'POST') return handleAddProxyIP(request, env.DB);
        }
        if (path.startsWith('/api/proxyip/')) {
            const id = path.split('/')[3];
            if (method === 'PUT') return handleUpdateProxyIP(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteProxyIP(env.DB, id);
        }

        // Outbounds
        if (path === '/api/outbound') {
            if (method === 'GET') return handleGetOutbounds(env.DB);
            if (method === 'POST') return handleAddOutbound(request, env.DB);
        }
        if (path.startsWith('/api/outbound/')) {
            const id = path.split('/')[3];
            if (method === 'PUT') return handleUpdateOutbound(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteOutbound(env.DB, id);
        }

        // CFIP
        if (path === '/api/cfip') {
            if (method === 'GET') return handleGetCFIPs(env.DB);
            if (method === 'POST') return handleAddCFIP(request, env.DB);
        }
        if (path.startsWith('/api/cfip/')) {
            const id = path.split('/')[3];
            if (method === 'PUT') return handleUpdateCFIP(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteCFIP(env.DB, id);
        }

        // 订阅生成 - VLESS
        if (path === '/api/subscribe/vless/config') {
            if (method === 'GET') return handleGetVlessConfig(env.DB);
        }
        if (path === '/api/subscribe/vless/generate') {
            if (method === 'POST') return handleGenerateVlessSubscribe(request, env.DB);
        }
        
        // 订阅生成 - SS
        if (path === '/api/subscribe/ss/config') {
            if (method === 'GET') return handleGetSSConfig(env.DB);
        }
        if (path === '/api/subscribe/ss/generate') {
            if (method === 'POST') return handleGenerateSSSubscribe(request, env.DB);
        }

        // SOCKS5 测速
        if (path === '/api/test-socks5' && method === 'POST') {
            return handleTestSocks5(request, env.DB);
        }

        // 出站测速
        if (path === '/api/test-outbound' && method === 'POST') {
            return handleTestOutbound(request, env.DB);
        }

        // 出站检测
        if (path === '/api/check-exit' && method === 'POST') {
            return handleCheckExit(request, env.DB);
        }

        return json({ error: 'Not Found' }, 404);
    }
};

// 登录
async function handleLogin(request, env) {
    const { apiKey } = await request.json();
    if (apiKey !== env.API_KEY) return json({ error: 'Invalid API Key' }, 401);

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('INSERT INTO sessions (api_key, expires_at, created_at) VALUES (?, ?, datetime("now"))').bind(token, expires).run();

    return json({ success: true, apiKey: token, expiresAt: expires });
}

// ProxyIP CRUD
async function handleGetProxyIPs(db) {
    const { results } = await db.prepare('SELECT * FROM proxy_ips ORDER BY sort_order, id').all();
    return json({ success: true, data: results });
}

async function handleAddProxyIP(request, db) {
    const { address, remark, enabled = true, sort_order = 0 } = await request.json();
    if (!address) return json({ error: '地址不能为空' }, 400);

    const type = parseProxyType(address);
    // ProxyIP 不允许 socks5 和 http 类型
    if (type === 'socks5' || type === 'http' || type === 'https') {
        return json({ error: 'SOCKS5/HTTP 代理请添加到全局出站' }, 400);
    }

    const max = await db.prepare('SELECT MAX(id) as m FROM proxy_ips').first();
    const finalRemark = remark || `ProxyIP-${(max?.m || 0) + 1}`;

    const r = await db.prepare('INSERT INTO proxy_ips (address, type, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
        .bind(address, type, finalRemark, enabled ? 1 : 0, sort_order).run();

    return json({ success: true, data: { id: r.meta.last_row_id, address, type, remark: finalRemark } });
}

async function handleUpdateProxyIP(request, db, id) {
    const body = await request.json();
    const sets = [], vals = [];
    if (body.address !== undefined) { 
        const type = parseProxyType(body.address);
        if (type === 'socks5' || type === 'http' || type === 'https') {
            return json({ error: 'SOCKS5/HTTP 代理请添加到全局出站' }, 400);
        }
        sets.push('address = ?', 'type = ?'); 
        vals.push(body.address, type); 
    }
    if (body.remark !== undefined) { sets.push('remark = ?'); vals.push(body.remark); }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order); }
    if (sets.length === 0) return json({ error: '没有要更新的字段' }, 400);

    sets.push('updated_at = datetime("now")');
    vals.push(id);
    await db.prepare(`UPDATE proxy_ips SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true });
}

async function handleDeleteProxyIP(db, id) {
    await db.prepare('DELETE FROM proxy_ips WHERE id = ?').bind(id).run();
    return json({ success: true });
}

// Outbound CRUD
async function handleGetOutbounds(db) {
    const { results } = await db.prepare('SELECT * FROM outbounds ORDER BY sort_order, id').all();
    return json({ success: true, data: results });
}

async function handleAddOutbound(request, db) {
    const { address, remark, enabled = true, sort_order = 0 } = await request.json();
    if (!address) return json({ error: '地址不能为空' }, 400);

    const type = parseOutboundType(address);
    if (type === 'unknown') {
        return json({ error: '地址格式错误，必须是 socks5:// 或 http:// 开头' }, 400);
    }

    const max = await db.prepare('SELECT MAX(id) as m FROM outbounds').first();
    const finalRemark = remark || `Outbound-${(max?.m || 0) + 1}`;

    const r = await db.prepare('INSERT INTO outbounds (address, type, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
        .bind(address, type, finalRemark, enabled ? 1 : 0, sort_order).run();

    return json({ success: true, data: { id: r.meta.last_row_id, address, type, remark: finalRemark } });
}

async function handleUpdateOutbound(request, db, id) {
    const body = await request.json();
    const sets = [], vals = [];
    if (body.address !== undefined) { 
        const type = parseOutboundType(body.address);
        if (type === 'unknown') return json({ error: '地址格式错误，必须是 socks5:// 或 http:// 开头' }, 400);
        sets.push('address = ?', 'type = ?'); 
        vals.push(body.address, type); 
    }
    if (body.remark !== undefined) { sets.push('remark = ?'); vals.push(body.remark); }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order); }
    if (sets.length === 0) return json({ error: '没有要更新的字段' }, 400);

    sets.push('updated_at = datetime("now")');
    vals.push(id);
    await db.prepare(`UPDATE outbounds SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true });
}

async function handleDeleteOutbound(db, id) {
    await db.prepare('DELETE FROM outbounds WHERE id = ?').bind(id).run();
    return json({ success: true });
}

// CFIP CRUD
async function handleGetCFIPs(db) {
    const { results } = await db.prepare('SELECT * FROM cf_ips ORDER BY sort_order, id').all();
    return json({ success: true, data: results });
}

async function handleAddCFIP(request, db) {
    const { address, port = 443, remark, enabled = true, sort_order = 0 } = await request.json();
    if (!address) return json({ error: '地址不能为空' }, 400);

    const max = await db.prepare('SELECT MAX(id) as m FROM cf_ips').first();
    const finalRemark = remark || `CFIP-${(max?.m || 0) + 1}`;

    const r = await db.prepare('INSERT INTO cf_ips (address, port, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
        .bind(address, port, finalRemark, enabled ? 1 : 0, sort_order).run();

    return json({ success: true, data: { id: r.meta.last_row_id, address, port, remark: finalRemark } });
}

async function handleUpdateCFIP(request, db, id) {
    const body = await request.json();
    const sets = [], vals = [];
    if (body.address !== undefined) { sets.push('address = ?'); vals.push(body.address); }
    if (body.port !== undefined) { sets.push('port = ?'); vals.push(body.port); }
    if (body.remark !== undefined) { sets.push('remark = ?'); vals.push(body.remark); }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order); }
    if (sets.length === 0) return json({ error: '没有要更新的字段' }, 400);

    sets.push('updated_at = datetime("now")');
    vals.push(id);
    await db.prepare(`UPDATE cf_ips SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true });
}

async function handleDeleteCFIP(db, id) {
    await db.prepare('DELETE FROM cf_ips WHERE id = ?').bind(id).run();
    return json({ success: true });
}

// 订阅
// VLESS 订阅配置
async function handleGetVlessConfig(db) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 1').first();
    return json({ success: true, data: config });
}

// SS 订阅配置
async function handleGetSSConfig(db) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 2').first();
    if (config) {
        // 将 uuid 字段作为 password 返回
        return json({ success: true, data: { password: config.uuid, snippets_domain: config.snippets_domain, proxy_path: config.proxy_path } });
    }
    return json({ success: true, data: null });
}

// VLESS 订阅生成
async function handleGenerateVlessSubscribe(request, db) {
    const { uuid, snippetsDomain, proxyPath = '/?ed=2560' } = await request.json();
    if (!uuid || !snippetsDomain) return json({ error: 'UUID 和域名不能为空' }, 400);

    const domain = snippetsDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    await db.prepare('INSERT OR REPLACE INTO subscribe_config (id, uuid, snippets_domain, proxy_path, updated_at) VALUES (1, ?, ?, ?, datetime("now"))').bind(uuid, domain, proxyPath).run();

    const { results: cfips } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    if (cfips.length === 0) return json({ error: '没有启用的 CFIP' }, 400);

    const { results: proxyips } = await db.prepare('SELECT * FROM proxy_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    const { results: outbounds } = await db.prepare('SELECT * FROM outbounds WHERE enabled = 1 ORDER BY sort_order, id').all();
    const allProxies = [...proxyips, ...outbounds];

    const links = [];
    if (allProxies.length === 0) {
        for (const cfip of cfips) {
            let host = cfip.address;
            if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
            const nodeName = cfip.remark || host;
            links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${domain}&fp=firefox&allowInsecure=1&type=ws&host=${domain}&path=${encodeURIComponent(proxyPath)}#${encodeURIComponent(nodeName)}`);
        }
    } else {
        for (const proxyip of allProxies) {
            for (const cfip of cfips) {
                let host = cfip.address;
                if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
                const path = proxyPath + (proxyPath.includes('?') ? '&' : '?') + `proxyip=${encodeURIComponent(proxyip.address)}`;
                const cfipRemark = cfip.remark || host;
                const nodeName = `${cfipRemark}-${proxyip.remark}`;
                links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${domain}&fp=firefox&allowInsecure=1&type=ws&host=${domain}&path=${encodeURIComponent(path)}#${encodeURIComponent(nodeName)}`);
            }
        }
    }

    return json({ success: true, data: { plain: links.join('\n'), count: links.length } });
}

// SS 订阅生成
async function handleGenerateSSSubscribe(request, db) {
    const { password, snippetsDomain, proxyPath } = await request.json();
    if (!password || !snippetsDomain) return json({ error: '密码和域名不能为空' }, 400);

    const domain = snippetsDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const finalPath = proxyPath || `/${password}`;
    
    // 保存配置，使用 uuid 字段存储 password
    await db.prepare('INSERT OR REPLACE INTO subscribe_config (id, uuid, snippets_domain, proxy_path, updated_at) VALUES (2, ?, ?, ?, datetime("now"))').bind(password, domain, finalPath).run();

    const { results: cfips } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    if (cfips.length === 0) return json({ error: '没有启用的 CFIP' }, 400);

    const method = 'none';
    const links = [];
    
    for (const cfip of cfips) {
        let host = cfip.address;
        if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
        const port = cfip.port || 443;
        const nodeName = cfip.remark || host;
        
        // SS 格式
        const ssConfig = `${method}:${password}`;
        const encodedConfig = btoa(ssConfig);
        // 原版格式: /path/?ed=2560，只对 = 编码，? 和 / 不编码
        const pathWithQuery = finalPath + '/?ed=2560';
        const encodedPath = pathWithQuery.replace(/=/g, '%3D');
        const ssLink = `ss://${encodedConfig}@${host}:${port}?plugin=v2ray-plugin;mode%3Dwebsocket;host%3D${domain};path%3D${encodedPath};tls;sni%3D${domain};skip-cert-verify%3Dtrue;mux%3D0#${encodeURIComponent(nodeName)}`;
        links.push(ssLink);
    }
    
    return json({ success: true, data: { plain: links.join('\n'), count: links.length } });
}

// 公开订阅
async function handleSubscribe(db, uuid) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 1').first();
    if (!config || uuid !== config.uuid) return new Response('Not Found', { status: 404 });

    const { results: cfips } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    if (cfips.length === 0) return new Response('No CFIP', { status: 404 });

    const { results: proxyips } = await db.prepare('SELECT * FROM proxy_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    const { results: outbounds } = await db.prepare('SELECT * FROM outbounds WHERE enabled = 1 ORDER BY sort_order, id').all();

    const proxyPath = config.proxy_path || '/?ed=2560';
    
    // 合并 ProxyIP 和 Outbound
    const allProxies = [...proxyips, ...outbounds];
    
    // 生成所有 ProxyIP × CFIP 的组合（相同 ProxyIP 的放在一起）
    const links = [];
    if (allProxies.length === 0) {
        // 没有 ProxyIP，只生成 CFIP
        for (const cfip of cfips) {
            let host = cfip.address;
            if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
            const nodeName = (cfip.remark || host) + '-VLESS';
            links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${config.snippets_domain}&fp=firefox&allowInsecure=1&type=ws&host=${config.snippets_domain}&path=${encodeURIComponent(proxyPath)}#${encodeURIComponent(nodeName)}`);
        }
    } else {
        // 为每个 ProxyIP 生成所有 CFIP 的组合
        for (const proxyip of allProxies) {
            for (const cfip of cfips) {
                let host = cfip.address;
                if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
                
                const path = proxyPath + (proxyPath.includes('?') ? '&' : '?') + `proxyip=${encodeURIComponent(proxyip.address)}`;
                const cfipRemark = cfip.remark || host;
                const nodeName = `${cfipRemark}-${proxyip.remark}-VLESS`;
                
                links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${config.snippets_domain}&fp=firefox&allowInsecure=1&type=ws&host=${config.snippets_domain}&path=${encodeURIComponent(path)}#${encodeURIComponent(nodeName)}`);
            }
        }
    }

    return new Response(btoa(unescape(encodeURIComponent(links.join('\n')))), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

// SS 公开订阅
async function handleSSSubscribe(db, password) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 2').first();
    if (!config || password !== config.uuid) return new Response('Not Found', { status: 404 });

    const { results: cfips } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    if (cfips.length === 0) return new Response('No CFIP', { status: 404 });

    const { results: proxyips } = await db.prepare('SELECT * FROM proxy_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    const { results: outbounds } = await db.prepare('SELECT * FROM outbounds WHERE enabled = 1 ORDER BY sort_order, id').all();

    const proxyPath = config.proxy_path || '/';
    const method = 'none';
    
    // 合并 ProxyIP 和 Outbound
    const allProxies = [...proxyips, ...outbounds];
    
    const links = [];
    if (allProxies.length === 0) {
        // 没有 ProxyIP，只生成 CFIP
        for (const cfip of cfips) {
            let host = cfip.address;
            if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
            const port = cfip.port || 443;
            const nodeName = (cfip.remark || host) + '-SS';
            
            const ssConfig = `${method}:${password}`;
            const encodedConfig = btoa(ssConfig);
            const pathWithQuery = proxyPath + '/?ed=2560';
            const encodedPath = pathWithQuery.replace(/=/g, '%3D');
            const ssLink = `ss://${encodedConfig}@${host}:${port}?plugin=v2ray-plugin;mode%3Dwebsocket;host%3D${config.snippets_domain};path%3D${encodedPath};tls;sni%3D${config.snippets_domain};skip-cert-verify%3Dtrue;mux%3D0#${encodeURIComponent(nodeName)}`;
            links.push(ssLink);
        }
    } else {
        // 为每个 ProxyIP 生成所有 CFIP 的组合
        for (const proxyip of allProxies) {
            for (const cfip of cfips) {
                let host = cfip.address;
                if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
                const port = cfip.port || 443;
                
                const path = proxyPath + (proxyPath.includes('?') ? '&' : '?') + `proxyip=${encodeURIComponent(proxyip.address)}`;
                const pathWithQuery = path + '&ed=2560';
                const encodedPath = pathWithQuery.replace(/=/g, '%3D');
                
                const cfipRemark = cfip.remark || host;
                const nodeName = `${cfipRemark}-${proxyip.remark}-SS`;
                
                const ssConfig = `${method}:${password}`;
                const encodedConfig = btoa(ssConfig);
                const ssLink = `ss://${encodedConfig}@${host}:${port}?plugin=v2ray-plugin;mode%3Dwebsocket;host%3D${config.snippets_domain};path%3D${encodedPath};tls;sni%3D${config.snippets_domain};skip-cert-verify%3Dtrue;mux%3D0#${encodeURIComponent(nodeName)}`;
                links.push(ssLink);
            }
        }
    }

    return new Response(btoa(unescape(encodeURIComponent(links.join('\n')))), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

// SOCKS5 测速
async function handleTestSocks5(request, db) {
    try {
        const { id } = await request.json();
        
        // 获取要测试的 ProxyIP
        let proxyips = [];
        if (id) {
            // 测试单个
            const proxy = await db.prepare('SELECT * FROM proxy_ips WHERE id = ? AND type = ?').bind(id, 'socks5').first();
            if (proxy) proxyips = [proxy];
        } else {
            // 测试所有 SOCKS5
            const { results } = await db.prepare('SELECT * FROM proxy_ips WHERE type = ? ORDER BY sort_order, id').bind('socks5').all();
            proxyips = results;
        }

        if (proxyips.length === 0) {
            return json({ error: 'No SOCKS5 proxy found' }, 404);
        }

        const results = [];
        for (const proxy of proxyips) {
            const startTime = Date.now();
            let socket = null;
            let writer = null;
            let reader = null;
            
            try {
                const parsed = parseSocks5Address(proxy.address);
                
                // 创建超时 Promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), 5000);
                });
                
                // 连接 SOCKS5 服务器
                const connectPromise = (async () => {
                    socket = connect({
                        hostname: parsed.host,
                        port: parsed.port
                    });

                    writer = socket.writable.getWriter();
                    reader = socket.readable.getReader();

                    // 发送 SOCKS5 握手
                    const authMethods = parsed.username && parsed.password ? 
                        new Uint8Array([0x05, 0x02, 0x00, 0x02]) :
                        new Uint8Array([0x05, 0x01, 0x00]);
                    
                    await writer.write(authMethods);
                    
                    // 读取服务器响应
                    const methodResponse = await reader.read();
                    
                    if (methodResponse.done || methodResponse.value.byteLength < 2) {
                        throw new Error('Invalid method response');
                    }
                    
                    const responseArray = new Uint8Array(methodResponse.value);
                    if (responseArray[0] !== 0x05) {
                        throw new Error('Invalid SOCKS version');
                    }
                    
                    const selectedMethod = responseArray[1];
                    
                    // 如果服务器选择了用户名密码认证
                    if (selectedMethod === 0x02) {
                        if (!parsed.username || !parsed.password) {
                            throw new Error('Server requires authentication');
                        }
                        
                        const encoder = new TextEncoder();
                        const userBytes = encoder.encode(parsed.username);
                        const passBytes = encoder.encode(parsed.password);
                        const authPacket = new Uint8Array(3 + userBytes.length + passBytes.length);
                        authPacket[0] = 0x01;
                        authPacket[1] = userBytes.length;
                        authPacket.set(userBytes, 2);
                        authPacket[2 + userBytes.length] = passBytes.length;
                        authPacket.set(passBytes, 3 + userBytes.length);
                        
                        await writer.write(authPacket);
                        const authResponse = await reader.read();
                        
                        if (authResponse.done || authResponse.value.byteLength < 2) {
                            throw new Error('Invalid auth response');
                        }
                        
                        if (new Uint8Array(authResponse.value)[1] !== 0x00) {
                            throw new Error('Authentication failed');
                        }
                    } else if (selectedMethod === 0xFF) {
                        throw new Error('No acceptable methods');
                    } else if (selectedMethod !== 0x00) {
                        throw new Error(`Unsupported auth method: ${selectedMethod}`);
                    }
                    
                    // 测试连接到 1.1.1.1:80
                    const connectPacket = new Uint8Array([
                        0x05, 0x01, 0x00, 0x01,
                        0x01, 0x01, 0x01, 0x01,
                        0x00, 0x50
                    ]);
                    
                    await writer.write(connectPacket);
                    const connectResponse = await reader.read();
                    
                    if (connectResponse.done || connectResponse.value.byteLength < 2) {
                        throw new Error('Invalid connect response');
                    }
                    
                    const connectArray = new Uint8Array(connectResponse.value);
                    if (connectArray[1] !== 0x00) {
                        throw new Error(`Connection failed with code: ${connectArray[1]}`);
                    }
                    
                    return Date.now() - startTime;
                })();
                
                // 等待连接或超时
                const latency = await Promise.race([connectPromise, timeoutPromise]);
                
                results.push({
                    id: proxy.id,
                    remark: proxy.remark,
                    address: proxy.address,
                    status: 'online',
                    latency
                });
            } catch (error) {
                results.push({
                    id: proxy.id,
                    remark: proxy.remark,
                    address: proxy.address,
                    status: 'offline',
                    latency: -1,
                    error: error.message
                });
            } finally {
                // 清理资源
                try {
                    if (writer) writer.releaseLock();
                    if (reader) reader.releaseLock();
                    if (socket) socket.close();
                } catch (e) {}
            }
        }

        return json({ success: true, results });
    } catch (error) {
        return json({ error: 'Test failed: ' + error.message }, 500);
    }
}

// 解析 SOCKS5 地址
function parseSocks5Address(address) {
    // socks5://user:pass@host:port 或 socks://user:pass@host:port
    const match = address.match(/^socks5?:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    if (!match) {
        throw new Error('Invalid SOCKS5 address format');
    }
    return {
        username: match[1] || '',
        password: match[2] || '',
        host: match[3],
        port: parseInt(match[4])
    };
}

// 解析 HTTP 代理地址
function parseHttpAddress(address) {
    // http://user:pass@host:port 或 http://host:port
    const match = address.match(/^https?:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    if (!match) {
        throw new Error('Invalid HTTP proxy address format');
    }
    return {
        username: match[1] || '',
        password: match[2] || '',
        host: match[3],
        port: parseInt(match[4])
    };
}

// 出站检测（检查代理的出口 IP 信息）
async function handleCheckExit(request, db) {
    try {
        const { id, ids } = await request.json();
        
        // 获取要检测的 Outbound
        let outbounds = [];
        if (id) {
            // 检测单个
            const outbound = await db.prepare('SELECT * FROM outbounds WHERE id = ?').bind(id).first();
            if (outbound) outbounds = [outbound];
        } else if (ids && Array.isArray(ids) && ids.length > 0) {
            // 检测指定的多个
            const placeholders = ids.map(() => '?').join(',');
            const { results } = await db.prepare(`SELECT * FROM outbounds WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...ids).all();
            outbounds = results;
        } else {
            // 检测所有
            const { results } = await db.prepare('SELECT * FROM outbounds ORDER BY sort_order, id').all();
            outbounds = results;
        }

        if (outbounds.length === 0) {
            return json({ error: '没有找到出站代理' }, 404);
        }

        const results = [];
        for (const outbound of outbounds) {
            let socket = null;
            let writer = null;
            let reader = null;
            
            try {
                // 解析代理地址获取主机名
                const parsed = outbound.type === 'socks5' 
                    ? parseSocks5Address(outbound.address)
                    : parseHttpAddress(outbound.address);
                
                // 获取入口信息（代理服务器本身的IP信息）
                let entryInfo = null;
                try {
                    const entryIPResponse = await fetch(`https://api.ipapi.is/?q=${parsed.host}`);
                    if (entryIPResponse.ok) {
                        entryInfo = await entryIPResponse.json();
                    }
                } catch (e) {
                    console.error('Failed to get entry info:', e);
                }
                
                if (outbound.type === 'socks5') {
                    // SOCKS5 代理检测
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 15000);
                    });
                    
                    const checkPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // SOCKS5 握手
                        const authMethods = parsed.username && parsed.password ? 
                            new Uint8Array([0x05, 0x02, 0x00, 0x02]) :
                            new Uint8Array([0x05, 0x01, 0x00]);
                        
                        await writer.write(authMethods);
                        const methodResponse = await reader.read();
                        
                        if (methodResponse.done || methodResponse.value.byteLength < 2) {
                            throw new Error('Invalid method response');
                        }
                        
                        const responseArray = new Uint8Array(methodResponse.value);
                        if (responseArray[0] !== 0x05) {
                            throw new Error('Invalid SOCKS version');
                        }
                        
                        const selectedMethod = responseArray[1];
                        
                        if (selectedMethod === 0x02) {
                            if (!parsed.username || !parsed.password) {
                                throw new Error('Server requires authentication');
                            }
                            
                            const encoder = new TextEncoder();
                            const userBytes = encoder.encode(parsed.username);
                            const passBytes = encoder.encode(parsed.password);
                            const authPacket = new Uint8Array(3 + userBytes.length + passBytes.length);
                            authPacket[0] = 0x01;
                            authPacket[1] = userBytes.length;
                            authPacket.set(userBytes, 2);
                            authPacket[2 + userBytes.length] = passBytes.length;
                            authPacket.set(passBytes, 3 + userBytes.length);
                            
                            await writer.write(authPacket);
                            const authResponse = await reader.read();
                            
                            if (authResponse.done || authResponse.value.byteLength < 2) {
                                throw new Error('Invalid auth response');
                            }
                            
                            if (new Uint8Array(authResponse.value)[1] !== 0x00) {
                                throw new Error('Authentication failed');
                            }
                        } else if (selectedMethod === 0xFF) {
                            throw new Error('No acceptable methods');
                        } else if (selectedMethod !== 0x00) {
                            throw new Error(`Unsupported auth method: ${selectedMethod}`);
                        }
                        
                        // 连接到 check.socks5.090227.xyz
                        const targetHost = 'check.socks5.090227.xyz';
                        const targetPort = 80;
                        const hostBytes = new TextEncoder().encode(targetHost);
                        const connectPacket = new Uint8Array([
                            0x05, 0x01, 0x00, 0x03,
                            hostBytes.length,
                            ...hostBytes,
                            (targetPort >> 8) & 0xFF,
                            targetPort & 0xFF
                        ]);
                        
                        await writer.write(connectPacket);
                        const connectResponse = await reader.read();
                        
                        if (connectResponse.done || connectResponse.value.byteLength < 2) {
                            throw new Error('Invalid connect response');
                        }
                        
                        const connectArray = new Uint8Array(connectResponse.value);
                        if (connectArray[1] !== 0x00) {
                            throw new Error(`Connection failed with code: ${connectArray[1]}`);
                        }
                        
                        // 发送 HTTP 请求获取 /cdn-cgi/trace
                        const encoder = new TextEncoder();
                        const httpRequest = `GET /cdn-cgi/trace HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n\r\n`;
                        await writer.write(encoder.encode(httpRequest));
                        
                        // 读取响应
                        let responseData = '';
                        const decoder = new TextDecoder();
                        let chunks = 0;
                        while (chunks < 100) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            responseData += decoder.decode(value, { stream: true });
                            chunks++;
                        }
                        
                        // 解析响应获取IP
                        const ipMatch = responseData.match(/ip=([\d\.]+)/);
                        if (!ipMatch) {
                            throw new Error('无法从响应中提取IP地址');
                        }
                        
                        const exitIP = ipMatch[1].trim();
                        
                        // 使用 ipapi.is API 获取详细信息
                        const ipInfoResponse = await fetch(`https://api.ipapi.is/?q=${exitIP}`);
                        if (!ipInfoResponse.ok) {
                            throw new Error(`IP信息查询失败: ${ipInfoResponse.status}`);
                        }
                        
                        const ipInfo = await ipInfoResponse.json();
                        
                        return {
                            ip: exitIP,
                            country: ipInfo.location?.country || 'Unknown',
                            city: ipInfo.location?.city || 'Unknown',
                            org: ipInfo.asn?.org || 'Unknown',
                            asn: ipInfo.asn?.asn ? `AS${ipInfo.asn.asn}` : 'Unknown',
                            fullExitInfo: ipInfo,
                            fullEntryInfo: ipInfo  // 入口和出口使用相同的信息
                        };
                    })();
                    
                    const exitInfo = await Promise.race([checkPromise, timeoutPromise]);
                    
                    // 保存到数据库（只保留 country 和 city 用于列表显示，详细信息存在 JSON 中）
                    await db.prepare('UPDATE outbounds SET exit_country = ?, exit_city = ?, entry_info_json = ?, exit_info_json = ?, checked_at = datetime("now") WHERE id = ?')
                        .bind(
                            exitInfo.country, 
                            exitInfo.city,
                            exitInfo.fullEntryInfo ? JSON.stringify(exitInfo.fullEntryInfo) : null,
                            exitInfo.fullExitInfo ? JSON.stringify(exitInfo.fullExitInfo) : null,
                            outbound.id
                        ).run();
                    
                    results.push({
                        id: outbound.id,
                        success: true,
                        ...exitInfo
                    });
                } else if (outbound.type === 'http') {
                    // HTTP 代理检测
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 15000);
                    });
                    
                    const checkPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // 发送 HTTP CONNECT 请求
                        const encoder = new TextEncoder();
                        const targetHost = 'check.socks5.090227.xyz';
                        const targetPort = 80;
                        let connectRequest = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n`;
                        
                        if (parsed.username && parsed.password) {
                            const auth = btoa(`${parsed.username}:${parsed.password}`);
                            connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
                        }
                        
                        connectRequest += `\r\n`;
                        await writer.write(encoder.encode(connectRequest));
                        
                        // 读取 CONNECT 响应
                        let connectResponseData = '';
                        const decoder = new TextDecoder();
                        let chunks = 0;
                        while (chunks < 10) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            connectResponseData += decoder.decode(value, { stream: true });
                            chunks++;
                            if (connectResponseData.includes('\r\n\r\n')) break;
                        }
                        
                        if (!connectResponseData.includes('200')) {
                            throw new Error('Proxy connection failed: ' + connectResponseData.split('\r\n')[0]);
                        }
                        
                        // 发送 HTTP 请求获取 /cdn-cgi/trace
                        const httpRequest = `GET /cdn-cgi/trace HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n\r\n`;
                        await writer.write(encoder.encode(httpRequest));
                        
                        // 读取响应
                        let responseData = '';
                        chunks = 0;
                        while (chunks < 100) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            responseData += decoder.decode(value, { stream: true });
                            chunks++;
                        }
                        
                        // 解析响应获取IP
                        const ipMatch = responseData.match(/ip=(.*)/);
                        if (!ipMatch) {
                            throw new Error('无法从响应中提取IP地址');
                        }
                        
                        const exitIP = ipMatch[1].trim();
                        
                        // 使用 ipapi.is API 获取详细信息
                        const ipInfoResponse = await fetch(`https://api.ipapi.is/?q=${exitIP}`);
                        if (!ipInfoResponse.ok) {
                            throw new Error(`IP信息查询失败: ${ipInfoResponse.status}`);
                        }
                        
                        const ipInfo = await ipInfoResponse.json();
                        
                        return {
                            ip: exitIP,
                            country: ipInfo.location?.country || 'Unknown',
                            city: ipInfo.location?.city || 'Unknown',
                            org: ipInfo.asn?.org || 'Unknown',
                            asn: ipInfo.asn?.asn ? `AS${ipInfo.asn.asn}` : 'Unknown',
                            fullExitInfo: ipInfo,
                            fullEntryInfo: ipInfo  // 入口和出口使用相同的信息
                        };
                    })();
                    
                    const exitInfo = await Promise.race([checkPromise, timeoutPromise]);
                    
                    // 保存到数据库（只保留 country 和 city 用于列表显示，详细信息存在 JSON 中）
                    await db.prepare('UPDATE outbounds SET exit_country = ?, exit_city = ?, entry_info_json = ?, exit_info_json = ?, checked_at = datetime("now") WHERE id = ?')
                        .bind(
                            exitInfo.country, 
                            exitInfo.city,
                            exitInfo.fullEntryInfo ? JSON.stringify(exitInfo.fullEntryInfo) : null,
                            exitInfo.fullExitInfo ? JSON.stringify(exitInfo.fullExitInfo) : null,
                            outbound.id
                        ).run();
                    
                    results.push({
                        id: outbound.id,
                        success: true,
                        ...exitInfo
                    });
                } else {
                    throw new Error('Unsupported outbound type: ' + outbound.type);
                }
            } catch (error) {
                results.push({
                    id: outbound.id,
                    success: false,
                    error: error.message
                });
            } finally {
                // 清理资源
                try {
                    if (writer) writer.releaseLock();
                    if (reader) reader.releaseLock();
                    if (socket) socket.close();
                } catch (e) {}
            }
        }

        return json({ success: true, results });
    } catch (error) {
        return json({ error: 'Check failed: ' + error.message }, 500);
    }
}

// 出站测速（支持 SOCKS5 和 HTTP）
async function handleTestOutbound(request, db) {
    try {
        const { id } = await request.json();
        
        // 获取要测试的 Outbound
        let outbounds = [];
        if (id) {
            // 测试单个
            const outbound = await db.prepare('SELECT * FROM outbounds WHERE id = ?').bind(id).first();
            if (outbound) outbounds = [outbound];
        } else {
            // 测试所有
            const { results } = await db.prepare('SELECT * FROM outbounds ORDER BY sort_order, id').all();
            outbounds = results;
        }

        if (outbounds.length === 0) {
            return json({ error: 'No outbound found' }, 404);
        }

        const results = [];
        for (const outbound of outbounds) {
            const startTime = Date.now();
            let socket = null;
            let writer = null;
            let reader = null;
            
            try {
                if (outbound.type === 'socks5') {
                    // SOCKS5 测速逻辑
                    const parsed = parseSocks5Address(outbound.address);
                    
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 5000);
                    });
                    
                    const connectPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // SOCKS5 握手
                        const authMethods = parsed.username && parsed.password ? 
                            new Uint8Array([0x05, 0x02, 0x00, 0x02]) :
                            new Uint8Array([0x05, 0x01, 0x00]);
                        
                        await writer.write(authMethods);
                        const methodResponse = await reader.read();
                        
                        if (methodResponse.done || methodResponse.value.byteLength < 2) {
                            throw new Error('Invalid method response');
                        }
                        
                        const responseArray = new Uint8Array(methodResponse.value);
                        if (responseArray[0] !== 0x05) {
                            throw new Error('Invalid SOCKS version');
                        }
                        
                        const selectedMethod = responseArray[1];
                        
                        if (selectedMethod === 0x02) {
                            if (!parsed.username || !parsed.password) {
                                throw new Error('Server requires authentication');
                            }
                            
                            const encoder = new TextEncoder();
                            const userBytes = encoder.encode(parsed.username);
                            const passBytes = encoder.encode(parsed.password);
                            const authPacket = new Uint8Array(3 + userBytes.length + passBytes.length);
                            authPacket[0] = 0x01;
                            authPacket[1] = userBytes.length;
                            authPacket.set(userBytes, 2);
                            authPacket[2 + userBytes.length] = passBytes.length;
                            authPacket.set(passBytes, 3 + userBytes.length);
                            
                            await writer.write(authPacket);
                            const authResponse = await reader.read();
                            
                            if (authResponse.done || authResponse.value.byteLength < 2) {
                                throw new Error('Invalid auth response');
                            }
                            
                            if (new Uint8Array(authResponse.value)[1] !== 0x00) {
                                throw new Error('Authentication failed');
                            }
                        } else if (selectedMethod === 0xFF) {
                            throw new Error('No acceptable methods');
                        } else if (selectedMethod !== 0x00) {
                            throw new Error(`Unsupported auth method: ${selectedMethod}`);
                        }
                        
                        // 测试连接到 1.1.1.1:80
                        const connectPacket = new Uint8Array([
                            0x05, 0x01, 0x00, 0x01,
                            0x01, 0x01, 0x01, 0x01,
                            0x00, 0x50
                        ]);
                        
                        await writer.write(connectPacket);
                        const connectResponse = await reader.read();
                        
                        if (connectResponse.done || connectResponse.value.byteLength < 2) {
                            throw new Error('Invalid connect response');
                        }
                        
                        const connectArray = new Uint8Array(connectResponse.value);
                        if (connectArray[1] !== 0x00) {
                            throw new Error(`Connection failed with code: ${connectArray[1]}`);
                        }
                        
                        return Date.now() - startTime;
                    })();
                    
                    const latency = await Promise.race([connectPromise, timeoutPromise]);
                    
                    results.push({
                        id: outbound.id,
                        remark: outbound.remark,
                        address: outbound.address,
                        status: 'online',
                        latency
                    });
                } else if (outbound.type === 'http') {
                    // HTTP 代理测速逻辑
                    const parsed = parseHttpAddress(outbound.address);
                    
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 5000);
                    });
                    
                    const connectPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // 发送 HTTP CONNECT 请求
                        const encoder = new TextEncoder();
                        let connectRequest = `CONNECT 1.1.1.1:80 HTTP/1.1\r\nHost: 1.1.1.1:80\r\n`;
                        
                        // 如果有认证信息
                        if (parsed.username && parsed.password) {
                            const auth = btoa(`${parsed.username}:${parsed.password}`);
                            connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
                        }
                        
                        connectRequest += `\r\n`;
                        
                        await writer.write(encoder.encode(connectRequest));
                        
                        // 读取响应
                        const response = await reader.read();
                        
                        if (response.done) {
                            throw new Error('No response from proxy');
                        }
                        
                        const decoder = new TextDecoder();
                        const responseText = decoder.decode(response.value);
                        
                        // 检查是否成功（HTTP/1.1 200 或 HTTP/1.0 200）
                        if (!responseText.includes('200')) {
                            throw new Error('Proxy connection failed: ' + responseText.split('\r\n')[0]);
                        }
                        
                        return Date.now() - startTime;
                    })();
                    
                    const latency = await Promise.race([connectPromise, timeoutPromise]);
                    
                    results.push({
                        id: outbound.id,
                        remark: outbound.remark,
                        address: outbound.address,
                        status: 'online',
                        latency
                    });
                } else {
                    throw new Error('Unsupported outbound type: ' + outbound.type);
                }
            } catch (error) {
                results.push({
                    id: outbound.id,
                    remark: outbound.remark,
                    address: outbound.address,
                    status: 'offline',
                    latency: -1,
                    error: error.message
                });
            } finally {
                // 清理资源
                try {
                    if (writer) writer.releaseLock();
                    if (reader) reader.releaseLock();
                    if (socket) socket.close();
                } catch (e) {}
            }
        }

        return json({ success: true, results });
    } catch (error) {
        return json({ error: 'Test failed: ' + error.message }, 500);
    }
}
