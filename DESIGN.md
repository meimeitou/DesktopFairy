---
name: DesktopFairy
description: 常驻 macOS 桌面的 Live2D 看板娘——奶油手账质感的暖色系统，薄荷绿签名色
colors:
  parchment-canvas: "#f5f8e0"
  parchment-warm: "#f7f3df"
  parchment-soft: "#f0ece2"
  parchment-deep: "#e8e2d2"
  parchment-edge: "#ddd5c2"
  ink-deep: "#4a3620"
  ink-body: "#5a442c"
  ink-soft: "#6d5436"
  ink-muted: "#725d42"
  ink-faint: "#7d6448"
  hairline: "#e8dcc8"
  hairline-strong: "#d8c9ae"
  hairline-bold: "#c4b89e"
  mint-primary: "#19c8b9"
  mint-hover: "#3dd4c6"
  mint-active: "#50b9ab"
  amber-warning: "#f5c31c"
  rust-error: "#e05a5a"
  moss-success: "#6fba2c"
typography:
  body:
    fontFamily: "Nunito, Noto Sans SC, -apple-system, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.62
  label:
    fontFamily: "Nunito, Noto Sans SC, -apple-system, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.01em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  pill: "50px"
  lg: "16px"
  md: "12px"
  sm: "8px"
  xs: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.mint-primary}"
    textColor: "{colors.parchment-canvas}"
    rounded: "{rounded.pill}"
  button-primary-hover:
    backgroundColor: "{colors.mint-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.parchment-warm}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  input:
    backgroundColor: "#faf8f3"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
  tag-solid:
    backgroundColor: "{colors.parchment-warm}"
    textColor: "{colors.ink-soft}"
    rounded: "999px"
  tab-active:
    backgroundColor: "{colors.mint-primary}"
    textColor: "#fff9e3"
    rounded: "{rounded.lg}"
---

# Design System: DesktopFairy

## Overview

**Creative North Star: "奶油手账"（The Cream Journal）**

DesktopFairy 的界面是一本摊开在 macOS 桌面上的奶油色手账：温暖的羊皮纸底色、暖棕墨水文字、薄荷绿作为唯一的签名色点缀。整个系统由 animal-island-ui 组件库（`animal-island-ui/style`，`src/main.tsx` 引入一次）提供基础 token 与组件皮肤，项目侧通过 `src/index.css` 的别名层把旧 Cherry-dark 变量名重映射到这套暖色值——所有页面 CSS 只引用 `--ink-*`（表面）、`--bone-*`（文字）、`--persimmon*`（薄荷绿）、`--hairline*`（描边）、`--rust*`（错误）、`--amber*`（警示）。

系统是浅色专用的：`color-scheme: light`，无深色模式，无纯黑——最深文字是暖棕 `#4a3620`。角色感来自材质（羊皮纸、圆角、软阴影）而非插画装饰；密度偏紧凑（14px 基准字号、40px 控件高度），因为核心用户是重度使用的开发者。

**Key Characteristics:**

- 暖羊皮纸表面层次 + 暖棕墨水文字，永不用纯黑或冷灰
- 薄荷绿 `#19c8b9` 唯一签名色，克制使用（选中、主按钮、焦点、悬停反馈）
- 圆角无处不在：胶囊按钮（50px）、面板 16px、气泡 14px——没有尖锐直角的主流 UI
- 组件库统一皮肤：优先用 animal-island-ui 官方 Button/Input/Tag，不自行重绘
- 动效克制且尊重 `prefers-reduced-motion`：默认 `.25s cubic-bezier(.4,0,.2,1)`

## Colors

暖色羊皮纸中性阶 + 单一薄荷绿签名色 + 功能色（琥珀警示、锈红错误、苔绿成功），全部继承自 animal-island-ui。

### Primary

- **乌屿薄荷绿**（#19c8b9）：唯一签名色。会话选中态、主按钮、Tab 激活态、焦点环、光标 caret、文字选区、输入框 focus 描边、划词工具栏悬停。悬停变亮 `#3dd4c6`，按下变深 `#50b9ab`。项目别名 `--persimmon`（历史遗留名，勿被字面迷惑）。

### Secondary

- **琥珀蜜糖**（#f5c31c）：警示与"进行中"状态——上下文清除标记、智能体思考时的呼吸光环（rgba(232,184,74,…) 暖琥珀光晕）。

### Tertiary

- **锈红**（#e05a5a）：错误气泡、错误状态覆盖层（`--rust`）。
- **苔绿**（#6fba2c）：Switch 开启态、成功反馈（库 token）。

### Neutral

- **羊皮纸阶**：`#f5f8e0`（窗口底 `--ink-900`）→ `#f7f3df`（卡片/气泡底 `--ink-850`，也是官方奶点壁纸的底色）→ `#f0ece2`（输入 dock `--ink-800`）→ `#e8e2d2` → `#ddd5c2`（最深表面）。
- **暖棕墨水阶**：`#4a3620`（标题 `--bone-100`）→ `#5a442c`（正文 `--bone-200`）→ `#6d5436`（次要 `--bone-300`）→ `#725d42`（弱化 `--bone-500`）→ `#7d6448`（占位符/提示 `--bone-600`，a11y 下限：所有羊皮纸表面 ≥4.5:1）。
- **发丝线阶**：`#e8dcc8`（分隔线）→ `#d8c9ae`（描边）→ `#c4b89e`（强描边），可见于羊皮纸上但不刺眼。
- **暗色代码块**是唯一例外：代码块用 gruvbox 暗色（底 `#32302f`、字 `#ebdbb2`），手账里贴的一块暗色代码纸片。

### Named Rules

**The One Mint Rule.** 薄荷绿只用于交互反馈（选中、激活、焦点、悬停），不做大面积铺色；例外是 Tab 激活态与主按钮。一个屏幕上薄荷绿面积 ≤10%，稀缺才是签名。

**The Warm Ink Rule.** 文字永远是暖棕，永不用纯黑 `#000` 或冷灰；表面永远是暖米色，永不用纯白做大底色（`#fff` 仅出现在个别代码输入区）。

**The Legacy Alias Rule.** 项目 CSS 用 `--persimmon`/`--ink-*`/`--bone-*` 等旧名（Cherry Studio 时代遗留），实际值已在 `src/index.css` 别名层重映射到暖色。新代码直接用 `--animal-*` token 或语义别名，禁止硬编码十六进制值重复定义已有 token。

## Typography

**Body Font:** Nunito（500/700/900，woff2 子集内嵌）+ Noto Sans SC（中文，400/500/700）
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, monospace（`--font-mono` 引用，项目内多处直接写 stack）

**Character:** Nunito 的圆润字形是这套系统的"手账笔迹"——圆头、友好、略带玩具感但不幼稚；中文用 Noto Sans SC 兜底保持工整。无衬线统一，无 display 字体。

### Hierarchy

- **Body**（500，14px，1.62）：正文基准；聊天气泡 13.5px、行高 1.62 是最长的阅读文本。
- **Title**（600，14px）：侧栏标题、设置项标签、Tab 文字（13px/500）。
- **Label**（500，11px，0.01em）：分组标签（设置侧栏 group label）、按钮小字（10px）、时间戳（10px，opacity .45）。聊天页标题 `.chat-title` 用 12px/600/大写/0.5px 字距——大写字母加宽字距是唯一的"标签变奏"。
- **Mono**（400，12px）：终端、代码块（12px/1.5）、SSH 主机名、模型路径、工具调用元信息。代码块语言标签用小写（`text-transform: lowercase`）。

### Named Rules

**The No-Display Rule.** 没有 display/hero 字号。最大文字是 44px 的空状态图标（emoji，非文字）；信息型 UI 的层级靠字重（500→600→700）与颜色（`--bone-200`→`--bone-500`→`--bone-600`）区分，不靠大字号。

## Layout

固定尺寸桌面窗口，不做响应式网页布局。聊天壳（ChatApp）：44px 顶栏（macOS 左侧留 78px 红绿灯避让）+ 12px 内边距的内容区，内容区是圆角浮岛面板的容器——每个功能页（聊天/终端/知识库/设置）是独立的圆角卡片浮在羊皮纸底上。

- **聊天页**：220px 会话侧栏 + 弹性主区（白底 `#fff` 圆角 12px 卡片），消息区顶部有极淡薄荷绿径向渐晕。输入框是悬浮 dock（左右 16px、底部 8px、圆角 20px）叠在消息列表上。
- **设置页**：196px 侧栏 + 弹性内容，侧栏菜单项 40px 高、12px 圆角。
- **间距节奏**：4 / 8 / 12 / 16 / 24（`--animal-spacing-*`）；组件内小间距 2-6px 常见。
- **消息气泡**：用户气泡最大宽 78%，助手气泡 `min(92%, 720px)`；助手气泡铺官方奶点壁纸（radial-gradient 双层点阵，28px/14px 网格）。
- **主窗（Live2D）**：完全透明无底，悬浮按钮组在 hover 时从底部浮现。
- **划词工具栏（TipView）**：inline-flex 紧凑工具条，半透明羊皮纸 + 14px backdrop blur。

## Elevation & Depth

克制的分层：阴影是环境光提示，不是拟物投影。三种层次并存，各有明确职责。

### Shadow Vocabulary

- **浮岛投影**（`0 8px 24px rgba(61,52,40,.14)`，`--animal-shadow-lg`）：主面板（聊天/终端/设置卡片、侧栏）浮在羊皮纸底上的唯一大阴影。
- **组件小阴影**（`0 2px 4px rgba(61,52,40,.06)`，`--animal-shadow-sm`）：按钮、卡片、输入框的轻环境光。
- **硬偏移 3D**（`0 3px #c4b89e`）：库输入框/选择器的"软玩具"底边——按下去位移 3px 消失，是唯一的拟物元素。
- **悬浮 dock 复合影**（`0 10px 28px rgba(121,79,39,.17), 0 1px 4px …, inset 0 1px 0 …`）：聊天输入 dock 的多层暖影。
- **窗口框架**（`0 8px 40px rgba(61,52,40,.18)` + 24px backdrop blur）：独立浮窗（设置窗、划词工具栏）的磨砂羊皮纸玻璃感。

### Named Rules

**The Flat-Rest Rule.** 静止状态平面化：阴影表达"这是一张浮着的纸片"，不表达高度竞争。悬停最多位移 1-2px（`translateY(-2px)`），不做放大跳动。

**The Felted Edge Rule.** 阴影颜色永远是暖棕 rgba(61,52,40,…)/rgba(121,79,39,…) 系，不用冷黑阴影；硬偏移阴影用发丝线棕 `#c4b89e`。

## Shapes

胶囊（pill）是按钮与输入框的唯一形状（50px 圆角）；面板与卡片 16-20px 大圆角；气泡 14px；小控件 8-12px；附件标签 4px。没有直角矩形的主流 UI，唯一 0 圆角是工具组卡片的内部分隔。1px 发丝线分隔（`--hairline`）替代粗边框；虚线（`2px dashed #d4c4a8`）用于"待填充"区域（dashed 卡片、手账感）。奶点壁纸是这套系统的签名纹理，用于助手气泡与工具调用卡片。

## Components

组件优先用 animal-island-ui 库皮肤（Button/Input/Tag/Tabs/Switch/Tooltip），页面 CSS 只做布局微调，不重绘库皮肤。以下记录实际使用的模式。

### Buttons

- **Shape:** 胶囊（50px）；库 Button 自带 `box-shadow-sm` 硬偏移感。
- **Primary:** 薄荷绿底 + 羊皮纸字（`#fff9e3`），600 字重。悬停变亮（`#3dd4c6`），按下 `translateY(1px) scale(0.98)` 物理下陷（全局 `.press` 规则，reduced-motion 时禁用）。
- **Ghost/透明小按钮**：透明底 + 发丝线描边 + 暖棕字（如 `.chat-clear-btn`：11px、8px 圆角）；悬停底色 `rgba(121,79,39,.06)` + 描边加深。删除类用库 danger 变体。
- **Focus:** `outline: 2px solid var(--animal-primary-color); outline-offset: 2px`——库标准。

### Chips

- **Style:** 库 Tag 三变体：solid（羊皮纸底 + 棕字 + `#d4c4a8` 描边）、outlined（透明底 + `#c4b89e` 描边）、soft（功能色 14% 透明底）。高度 24/32/40px，字重 600，胶囊。
- **State:** 上下文清除标记（✂ 胶囊）是手账感的典型：琥珀 soft 底 + 琥珀描边 + ✂ 前缀字符。

### Cards / Containers

- **Corner Style:** 16px（侧栏、面板）、12px（菜单项、工具组卡片）、20px（输入 dock）。
- **Background:** 羊皮纸阶（`--animal-bg-color` `#f8f8f0` 或 `--ink-850` `#f7f3df`）；助手气泡铺奶点壁纸。
- **Shadow Strategy:** 浮岛面板 `--animal-shadow-lg`，见 Elevation。
- **Border:** 0.5-1px 发丝线（`--hairline-strong`）；虚线边框 = 可放置/待填充区域。
- **Internal Padding:** 卡片 16px 24px（库标准）；列表项 8px 10px；面板间 12px。

### Inputs / Fields

- **Style:** 库 Input：`#faf8f3` 底、胶囊、底部 3px 硬偏移 `#d4c9b4`（悬停加深到 `#c4b89e`）；占位符 `--bone-600`。
- **Focus:** 薄荷绿 caret + 输入 dock focus 时描边变 `rgba(25,200,185,.45)` 并加 1px 薄荷绿外圈。
- **Busy 态:** 输入 dock 生成中时琥珀色呼吸光环（3.2s breathe 动画 + 旋转 conic-gradient 双光束描边 `--df-aura-angle`）——系统里最华丽的动效，专属于"角色在想事情"这个时刻。
- **Error:** `box-shadow: 0 3px #c94444` 硬偏移变锈红。

### Navigation

- **顶部 Tab**（对话/终端/知识库/设置）：13px/500 文字，激活 `--bone-100`，未激活 `--bone-500`；无底色胶囊，仅颜色切换。
- **设置侧栏菜单**：40px 高、12px 圆角项；激活项 `--persimmon-softer` 底 + 薄荷绿左缘 2px 标记 + 图标变 `--persimmon-bright`——与会话列表项同款选中语法（One Mint Rule）。
- **会话列表项**：10px 圆角、激活时薄荷绿 soft 底 + 左缘 2px 标记；列表项入场有 30ms 级联上浮动画（reduced-motion 禁用）。

### 划词工具栏（TipView）

系统签名组件：1px 间距紧凑排列的竖排图标+10px 小字按钮组，半透明羊皮纸（92%）+ 14px backdrop blur + 12px 圆角 + 暖棕复合影。动作按钮用库 text Button 皮肤。

### 台词气泡（Live2D Speech Bubble）

系统签名组件：暖深棕半透明底（rgba(74,54,32,.82)）+ 奶白字 `#fffbe7` + 10px 圆角 + 旋转 45° 小方块尾巴；弹入用 0.22s `cubic-bezier(0.22,1,0.36,1)` 从尾巴处展开。这是羊皮纸世界里唯一的"深色纸片"，属于角色本体而非 UI chrome。

## Do's and Don'ts

### Do:

- **Do** 新组件优先用 animal-island-ui 库组件（Button/Input/Tag/Switch/Tooltip/Tabs），页面 CSS 只调布局；库皮肤就是官方皮肤。
- **Do** 颜色一律走 token：表面用 `--ink-*` / `--animal-bg-*`，文字用 `--bone-*`，签名色用 `--persimmon*` / `--animal-primary-color`，描边用 `--hairline*`。
- **Do** 交互反馈用薄荷绿的 soft 透明底（9%-14%）+ 1px 同色系描边，这是选中态的统一语法（会话项、Tab 悬停、drop target）。
- **Do** 动效遵守时长阶梯 `.15s / .25s / .35s` + `cubic-bezier(.4,0,.2,1)`；所有非必要动效包在 `prefers-reduced-motion` 里。
- **Do** 按下反馈用全局物理下陷（`translateY(1px) scale(0.98)`，`.press` 类或裸 button 自动获得）。
- **Do** "手账内页"场景（助手气泡、工具卡片、空状态）可用奶点壁纸纹理增强材质感。

### Don't:

- **Don't** 引入冷色系（蓝、紫、冷灰）或纯黑——用户气泡的淡蓝底 rgba(86,148,219,.12) 与设置菜单的冷蓝是遗留偏差，不要扩散。
- **Don't** 硬编码新十六进制颜色值；先查 `src/index.css` 别名层与库 token，没有再考虑加 token。
- **Don't** 用大面积薄荷绿铺底或做渐变背景；薄荷绿是点缀，不是底色。
- **Don't** 加深色模式；系统是 `color-scheme: light` 专用，深色代码块（gruvbox）是唯一例外。
- **Don't** 给库组件写覆盖皮肤（`.animal-*` 类内样式覆盖）；需要不同外观时在包裹层用语义类微调。
- **Don't** 使用尖锐直角或粗边框；圆角 + 发丝线是唯一形制。
