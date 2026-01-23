# CF-Snippets/Worker-Extend
**本项目为老王的Snippets/Worker脚本功能扩展（SS/VLESS），需要先部署老王的Snippets/Worker，再部署这个,这个只负责根据配置的proxyIP、优选IP/域名、全局出站代理生成订阅，实际的节点还是走原本的
主要是为了方便更换优选域名/IP和proxyip**
> 一个功能强大的 Cloudflare Workers 代理管理工具，集成 ProxyIP、全局出站、CFIP 管理和订阅生成功能


## 📢 致谢声明

本项目并非原创，而是基于以下优秀开源项目的扩展融合：

- [**老王的 Cloudflare-proxy**](https://github.com/eooce/Cloudflare-proxy) - 提供了核心的代理转发思路
- [**CM 的 CF-Workers-CheckSocks5**](https://github.com/cmliu/CF-Workers-CheckSocks5) - 提供了 SOCKS5 测速检测功能
- [**总工的 cf_sinppets**](https://github.com/ryty1/cf_sinppets) - 提供了 Snippets 管理基础架构

感谢以上作者的无私分享，让这个项目得以诞生！🙏

---

## ✨ 功能特性

### 1️⃣ ProxyIP 管理
- 支持 IP/域名代理配置
- 批量添加/启用/禁用/删除
- 自动类型识别（IPv4/IPv6/域名）
- 备注管理，方便识别

### 2️⃣ 全局出站管理
- 支持 **SOCKS5** 和 **HTTP** 代理协议
- 支持用户名密码认证
- **批量测速**：测试代理延迟和连通性
- **出站检测**：自动检测代理出口 IP 的国家、城市、ASN 等信息
- **详细信息查看**：查看代理的入口和出口详细信息（IP、地理位置、运营商、风险评分等）
- 地址隐藏/显示切换，保护隐私

### 3️⃣ CFIP 管理
- 优选 Cloudflare IP/域名配置
- 自定义端口（默认 443）
- 批量操作支持

### 4️⃣ 订阅生成
- **VLESS 订阅**：一键生成 VLESS 协议订阅链接
- **Shadowsocks 订阅**：一键生成 SS 协议订阅链接
- 自动组合 CFIP × ProxyIP/Outbound，生成所有可用节点
- 节点命名规则：`CFIP备注-ProxyIP备注-协议`（如：`香港-代理1-VLESS`）
- Base64 编码订阅输出
- 支持 Clash 订阅转换
- 数据持久化：配置自动保存，刷新页面后自动加载
- 支持自定义 UUID/密码、域名和路径

### 5️⃣ 数据管理
- **导出/导入**：支持 JSON 格式数据备份和迁移
- 导出内容包含：ProxyIP、全局出站、CFIP、VLESS 订阅配置、SS 订阅配置
- 两种导入模式：作为新数据导入（追加）或完全覆盖导入（替换）
- 自动数据库初始化
- 30 天免登录会话

---

## 📸 功能截图

### 登录界面
![登录界面](screenshots/login.png)
> 使用 API Key 登录，支持 30 天免登录

### ProxyIP 管理
![ProxyIP 管理](screenshots/proxyip.png)
![ProxyIP 管理-卡片](screenshots/proxyip2.png)
> 管理普通 IP/域名代理，支持批量操作

### 全局出站管理
![全局出站管理](screenshots/outbound.png)
> 管理 SOCKS5/HTTP 代理，支持测速和出站检测
![全局出站管理-卡片样式](screenshots/outbound-card.png)

### 出站详细信息
![出站详细信息](screenshots/exit-detail.png)
> 查看代理的入口和出口详细信息

### CFIP 管理
![CFIP 管理](screenshots/cfip.png)
![CFIP 管理-卡片](screenshots/cfip2.png)
> 管理 Cloudflare 优选 IP/域名

### 订阅生成
![订阅生成](screenshots/subscribe.png)
> 一键生成 VLESS 订阅链接

---

## 🚀 部署教程（小白专用）

无需安装任何软件，只需浏览器即可完成部署！

### 前置要求
- 一个 Cloudflare 账号（没有的话去 [cloudflare.com](https://dash.cloudflare.com/sign-up) 免费注册）

---

### 步骤 1：登录 Cloudflare

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)，登录你的账号。

---

### 步骤 2：创建 D1 数据库

1. 在左侧菜单找到 **Workers 和 Pages**，点击进入
2. 切换到 **D1 SQL 数据库** 标签页
3. 点击 **创建数据库** 按钮
4. 数据库名称填写：`snippets-manager-db`
5. 点击 **创建** 按钮

![创建 D1 数据库](screenshots/create-d1-web.png)

创建成功后，**记下数据库 ID**（在数据库详情页面可以看到，格式类似：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

![复制数据库 ID](screenshots/copy-db-id.png)

---

### 步骤 3：创建 Worker

1. 返回 **Workers 和 Pages** 主页
2. 点击 **创建应用程序** 按钮
3. 选择 **创建 Worker**
4. Worker 名称填写：`snippets-manager`（可自定义）
5. 点击 **部署** 按钮

![创建 Worker](screenshots/create-worker-web.png)

---

### 步骤 4：上传代码

1. 部署成功后，点击 **编辑代码** 按钮
2. 删除编辑器中的所有默认代码
3. 打开本项目的 `worker.js` 文件，复制全部内容
4. 粘贴到 Cloudflare 编辑器中
5. 点击右上角 **保存并部署** 按钮

![上传代码](screenshots/upload-code-web.png)

---

### 步骤 5：绑定数据库

1. 点击 **设置** 标签页
2. 找到 **绑定** 部分，点击 **添加**
3. 选择 **D1 数据库**
4. 变量名称填写：`DB`（必须是大写的 DB）
5. D1 数据库选择：`snippets-manager-db`（步骤 2 创建的数据库）
6. 点击 **保存** 按钮

![绑定数据库](screenshots/bind-db-web.png)

---

### 步骤 6：设置 API Key

1. 在 **设置** 页面，找到 **环境变量** 部分
2. 点击 **添加变量** 按钮
3. 变量类型选择：**加密**
4. 变量名称填写：`API_KEY`（必须是大写）
5. 值填写：你自己设定的登录密码（例如：`mySecretKey123`）
6. 点击 **保存并部署** 按钮

![设置 API Key](screenshots/set-apikey-web.png)

**注意**：这个密钥将用于登录管理界面，请妥善保管！

---

### 步骤 7：访问管理界面

1. 返回 Worker 主页，复制你的 Worker 地址（格式：`https://snippets-manager.你的子域.workers.dev`）
2. 在浏览器中打开这个地址
3. 使用步骤 6 中设置的 API Key 登录即可！


---

### 步骤 8：导入初始数据（可选）

为了快速开始使用，项目提供了初始数据文件 `initial-data.json`，包含：
- 2 个 ProxyIP 示例
- 5 个 CFIP 优选域名/IP

**导入步骤：**

1. 下载项目中的 `initial-data.json` 文件
2. 登录管理界面后，点击右上角 **📥 导入** 按钮
3. 选择 **📥 作为新数据导入**（推荐）或 **⚠️ 完全覆盖导入**
4. 选择下载的 `initial-data.json` 文件
5. 导入成功后，即可看到示例数据


**提示**：
- **作为新数据导入**：将示例数据添加到现有数据中，不会删除任何数据
- **完全覆盖导入**：删除所有现有数据，然后导入示例数据（慎用）

你也可以跳过此步骤，手动添加自己的数据。

---

## 📖 使用指南

### 0. 快速开始：导入初始数据（推荐 也可以跳过这步自己加CFIP、ProxyIP、全局出站）

如果你是第一次使用，可以先导入项目提供的初始数据快速体验：

1. 下载项目中的 `initial-data.json` 文件
2. 点击右上角 **📥 导入** 按钮
3. 在弹出的模态框中选择 **📥 作为新数据导入**
4. 选择 `initial-data.json` 文件
5. 导入成功后，会自动添加示例 ProxyIP 和 CFIP

**两种导入模式说明：**
- **📥 作为新数据导入**：将导入的数据添加到现有数据中，不会删除任何现有数据（推荐）
- **⚠️ 完全覆盖导入**：删除所有现有数据，然后导入新数据（危险操作，会有二次确认）


---

### 1. 添加 CFIP（必需）

进入 **CFIP** 标签页，点击 **+ 添加**，输入优选的 Cloudflare IP 或域名：

- 示例 1：`162.159.192.1`（优选 IP）
- 示例 2：`icook.hk`（优选域名）
- 端口：默认 `443`，可自定义

支持批量添加，每行一条，格式：`IP/域名:端口#备注`

![添加 CFIP](screenshots/add-cfip.png)

---

### 2. 添加 ProxyIP（可选）

进入 **ProxyIP** 标签页，添加普通代理 IP/域名：

- 示例：`cdn.xn--b6gac.eu.org`
- 备注：`ProxyIP-1`

**注意**：ProxyIP 不支持 SOCKS5/HTTP 协议，如需添加请使用"全局出站"功能。


---

### 3. 添加全局出站（可选）

进入 **全局出站** 标签页，添加 SOCKS5 或 HTTP 代理：

- SOCKS5 示例：`socks5://user:pass@host:1080`
- HTTP 示例：`http://user:pass@host:8080`

添加后可以：
- 点击 **测速** 按钮测试延迟
- 点击 **出站检测** 查看代理出口 IP 信息
- 点击出站信息列查看详细信息（国家、城市、ASN、风险评分等）


---

### 4. 生成订阅

#### VLESS 订阅

进入 **订阅生成VLESS** 标签页：

1. 填写 **UUID**（可使用在线生成器：https://www.uuidgenerator.net/）
2. 填写 **Snippets/Worker 域名**（你的 Workers 域名，例如：`snippets-manager.你的子域.workers.dev`）
3. 填写 **Path**（默认：`/?ed=2560`）
4. 点击 **💾 保存并生成订阅**

生成后会显示：
- **订阅地址**（格式：`https://你的域名/sub/你的UUID`）
- **Clash 订阅地址**（自动转换为 Clash 格式）

#### Shadowsocks 订阅

进入 **订阅生成SS** 标签页：

1. 填写 **密码 (Password)**（自定义密码）
2. 填写 **Snippets/Worker 域名**（与 VLESS 相同）
3. 填写 **Path**（可选，留空则使用密码作为路径）
4. 点击 **💾 保存并生成订阅**

生成后会显示：
- **订阅地址**（格式：`https://你的域名/sub/ss/你的密码`）
- **Clash 订阅地址**（自动转换为 Clash 格式）

**订阅特性：**
- 自动组合所有启用的 CFIP 和 ProxyIP/Outbound
- 节点命名格式：`CFIP备注-ProxyIP备注-协议`（如：`香港-代理1-VLESS`、`美国-代理2-SS`）
- 配置自动保存，刷新页面后自动加载
- 支持一键复制订阅地址
- **支持指定ID生成订阅**：通过URL参数指定特定的ProxyIP、Outbound或CFIP ID

#### 高级用法：指定ID生成订阅

你可以通过在订阅URL后添加参数来生成指定ID的订阅链接：
主要用于一个全局落地作为一个订阅源一致 可以设置自动检测最低延迟的，落地一致

**参数说明：**
- `proxyip`：指定ProxyIP的ID，多个ID用逗号分隔
- `outbound`：指定全局出站的ID，多个ID用逗号分隔
- `cfip`：指定CFIP的ID，多个ID用逗号分隔

**使用示例：**

1. **指定单个ProxyIP**：
   ```
   https://你的域名/sub/你的UUID?proxyip=1
   ```
   生成ID为1的ProxyIP × 所有启用的CFIP的订阅

2. **指定多个ProxyIP**：
   ```
   https://你的域名/sub/你的UUID?proxyip=1,3,5
   ```
   生成ID为1、3、5的ProxyIP × 所有启用的CFIP的订阅

3. **指定全局出站**：
   ```
   https://你的域名/sub/你的UUID?outbound=2,4
   ```
   生成ID为2、4的全局出站 × 所有启用的CFIP的订阅

4. **同时指定ProxyIP和全局出站**：
   ```
   https://你的域名/sub/你的UUID?proxyip=1&outbound=2
   ```
   生成ID为1的ProxyIP和ID为2的全局出站 × 所有启用的CFIP的订阅

5. **指定CFIP**：
   ```
   https://你的域名/sub/你的UUID?cfip=1,2,3
   ```
   生成所有启用的ProxyIP/全局出站 × ID为1、2、3的CFIP的订阅

6. **完全自定义组合**：
   ```
   https://你的域名/sub/你的UUID?proxyip=1,2&outbound=3&cfip=1,2
   ```
   生成ID为1、2的ProxyIP和ID为3的全局出站 × ID为1、2的CFIP的订阅

**SS订阅同样支持：**
```
https://你的域名/sub/ss/你的密码?proxyip=1,2&cfip=1,2,3
```

**重要说明：**
- 指定ID时，**不管该ID是否启用状态**，都会被包含在订阅中
- 未指定参数时，使用所有**启用状态**的项目
- 指定`proxyip`或`outbound`参数时，只会使用指定的ID，不会包含其他启用的项目
- 指定`cfip`参数时，只会使用指定的CFIP ID
- 可以灵活组合参数，生成不同的订阅链接
- 节点数量 = (指定的ProxyIP数量 + 指定的Outbound数量) × 指定的CFIP数量

**使用场景：**
- 为不同设备生成不同的订阅（如：手机用低延迟节点，电脑用高速节点）
- 测试特定节点组合的效果
- 为不同用户分配不同的节点
- 临时禁用某些节点但保留在订阅中
- **单落地多入口优选**：为单个全局出站（落地）生成独立订阅，配合客户端自动选择最低延迟功能，实现同一落地的多入口自动优选，保证落地一致性（例如：一个美国落地配置多个优选域名/IP，客户端自动选择延迟最低的入口）

---

### 5. 导入到客户端

复制订阅地址，粘贴到你的 V2Ray/Clash/Shadowrocket 等客户端中，更新订阅即可！


---

## 🔧 高级功能

### 批量操作
- 勾选多个项目后，可批量启用/禁用/删除
- 支持批量测速和出站检测

### 数据导出/导入

#### 导出数据
- 点击右上角 **📤 导出** 按钮
- 自动下载 JSON 格式的备份文件（文件名格式：`cf-snippets-managerend-YYYY-MM-DD.json`）
- 备份文件包含：
  - 所有 ProxyIP 配置
  - 所有全局出站配置
  - 所有 CFIP 配置
  - VLESS 订阅配置（UUID、域名、路径）
  - SS 订阅配置（密码、域名、路径）

#### 导入数据
1. 点击右上角 **📥 导入** 按钮
2. 选择导入模式：
   - **📥 作为新数据导入**（推荐）
     - 将导入的数据添加到现有数据中
     - 不会删除任何现有数据
     - 适合合并多个备份文件或添加新数据
     - 订阅配置会被更新（不会重复）
   - **⚠️ 完全覆盖导入**（危险）
     - 先删除所有现有数据（包括订阅配置）
     - 然后导入新数据
     - 会有二次确认提示
     - 适合完全恢复备份或重置数据
3. 选择 JSON 备份文件
4. 等待导入完成

![导入模式选择](screenshots/import-modes.png)

**使用场景：**
- **备份数据**：定期导出数据，防止数据丢失
- **迁移数据**：在不同 Worker 之间迁移配置
- **分享配置**：与他人分享你的优选 IP/域名配置
- **批量添加**：使用初始数据文件快速添加常用配置
- **恢复配置**：误删数据后快速恢复

**注意事项：**
- 导出的 JSON 文件包含所有配置，请妥善保管
- 导入前建议先导出当前数据作为备份
- 完全覆盖导入会删除所有数据，请谨慎使用

### 地址隐藏
- 在全局出站页面，点击 **👁️ 显示地址** / **🔒 隐藏地址** 切换显示模式
- 隐藏模式下，SOCKS5/HTTP 地址会显示为 `***`，保护隐私
- 适合在公共场合或截图分享时使用

---

## 📝 格式说明

### ProxyIP 格式
```
# 单行格式
IP/域名#备注

# 批量添加示例
210.61.97.241#香港节点
proxy.example.com#美国节点
```

### 全局出站格式
```
# SOCKS5（无认证）
socks5://host:port#备注

# SOCKS5（有认证）
socks5://user:pass@host:port#备注

# HTTP（无认证）
http://host:port#备注

# HTTP（有认证）
http://user:pass@host:port#备注
```

### CFIP 格式
```
# 单行格式
IP/域名:端口#备注

# 批量添加示例
162.159.192.1:443#优选IP-1
icook.hk#优选域名
```

---

## ❓ 常见问题

### Q1：测速显示"离线"怎么办？
- 检查代理地址格式是否正确
- 确认代理服务器是否在线
- 本地代理（127.0.0.1）无法从 CF 访问，会显示离线

### Q2：出站检测失败？
- 确保代理支持 TCP 连接
- 检查代理是否有流量限制
- 部分代理可能不支持出站检测

### Q3：订阅生成后无法使用？
- **VLESS 订阅**：
  - 确认 UUID 格式正确（标准 UUID 格式）
  - 确认 Snippets/Worker 域名填写正确（不要带 `https://`）
  - 确认至少添加了一个启用的 CFIP
- **SS 订阅**：
  - 确认密码已填写
  - 确认 Snippets/Worker 域名填写正确
  - Path 可以留空（会自动使用密码作为路径）
  - 确认至少添加了一个启用的 CFIP

### Q4：如何修改 API Key？
在 Cloudflare Workers 设置页面：
1. 进入 **设置** → **环境变量**
2. 找到 `API_KEY` 变量
3. 点击 **编辑**，输入新密钥
4. 点击 **保存并部署**

### Q5：导入数据时应该选择哪种模式？
- **首次使用**：选择"作为新数据导入"，导入 `initial-data.json` 快速开始
- **添加新数据**：选择"作为新数据导入"，不会影响现有数据
- **合并配置**：选择"作为新数据导入"，可以合并多个备份文件
- **恢复备份**：选择"完全覆盖导入"，完全恢复到备份时的状态
- **重置数据**：选择"完全覆盖导入"，清空所有数据后导入新配置

### Q6：导入失败怎么办？
- 检查 JSON 文件格式是否正确
- 确认文件是从本项目导出的或使用 `initial-data.json`
- 查看浏览器控制台（F12）的错误信息
- 尝试重新导出数据或使用初始数据文件

### Q7：VLESS 和 SS 订阅有什么区别？
- **VLESS**：更现代的协议，支持更多特性，推荐使用
- **SS (Shadowsocks)**：经典协议，兼容性好，部分客户端可能只支持 SS
- 两种订阅可以同时使用，互不影响
- 节点数量和质量完全相同，只是协议不同

### Q8：为什么订阅配置会自动保存？
- 为了方便使用，填写的 UUID/密码、域名、路径会自动保存到数据库
- 刷新页面后会自动加载上次的配置
- 如果已有配置，进入页面时会自动显示订阅地址
- 导出数据时会包含订阅配置，导入时也会恢复

---

## 📄 开源协议

本项目采用 MIT 协议开源，欢迎 Fork 和 Star！

---

## 📁 项目文件说明

```
CF-snippets-managerend/
├── worker.js          # 主程序文件（单文件包含前端和后端）
├── wrangler.json         # Cloudflare Workers 配置文件
├── initial-data.json     # 初始数据文件（可选导入）
└── README.md             # 项目说明文档
```

**文件说明：**
- `worker.js`：完整的应用程序代码，包含 HTML、CSS、JavaScript 和后端 API
- `wrangler.json`：Workers 部署配置，包含数据库绑定信息
- `initial-data.json`：提供的初始数据，包含示例 ProxyIP 和 CFIP，可选导入
- `README.md`：完整的使用文档和部署教程

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## ⚠️ 免责声明

本项目仅供学习交流使用，请勿用于非法用途。使用本项目所产生的一切后果由使用者自行承担。
