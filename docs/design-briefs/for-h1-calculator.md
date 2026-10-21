> **这是什么**：给 Claude Design 用的设计说明，用来出 EZbuild 官网 H1 计算器页
> `h1-calculator.html` 的视觉稿。
>
> **流程**：把下面「粘贴给 Claude Design 的说明」整段粘进 Claude Design → 出稿 →
> 在画布上可视化调整 → 稿子交回，落成 `frontend/h1-calculator.html`，并同步改
> `index.html` 的导航 / footer 两处。
>
> **设计 token 是实读的，不是拟定值**——全部来自本仓库
> `frontend/css/unified-theme.css`。页面文案由 `backend/src/h1/` 的实际输出和
> H1/AS1 第 6 版原文提炼。
>
> **后端已经全部做完并通过测试**（`backend/src/h1/`，252 passed）。这一页是纯前端
> 壳子，所有计算走已有的 5 个公开 endpoint，不需要新写后端。
>
> 相关：[H1 引擎](../../backend/src/h1/engine.py) ·
> [优化器](../../backend/src/h1/optimise.py) ·
> [BRANZ 交接](../../backend/src/h1/branz_export.py)

---

# 粘贴给 Claude Design 的说明 —— EZbuild `h1-calculator.html`

设计一个名为 **h1-calculator.html** 的工具页，它要无缝并入一个已存在的深色 SaaS
网站（EZbuild，新西兰建筑合规平台）。

全站文案是英文，**页面上所有可见文字必须用英文**。下面给出的 copy 请逐字使用，
不要改写、不要翻译——里面很多是法规条款原文的转述，改一个词就可能变成错误的
合规陈述。

---

## 一、这个工具解决什么问题（决定了信息层级）

新西兰建筑规范 H1 的「Calculation method」允许各围护部位互相权衡：墙差一点可以
用屋顶补回来，地基不保温可以用更好的窗户换。**能通过的组合有无数种**，设计师现在
的做法是在 BRANZ 的 Excel 里一种一种试，试到一个能过的就停——那通常不是最便宜的。

这一页做的事：**把所有能通过的组合穷举出来，按造价排序。**

所以页面的主角不是「通过 / 不通过」这个结论，而是**一张可以横向比较的方案表**。
用户来这里不是问「我这样行不行」，是问「哪种做法最划算」。

**一个必须体现在设计里的洞察**：最便宜的方案往往余量极薄。真实数据里，最便宜的
方案只剩 **+1.9 W/K** 余量——施工时任何一点变更都会击穿；多花 $2,800 的第二名有
**+19.6 W/K**。所以**造价和余量是两根轴**，表格必须让人一眼看到取舍，不能只把造价
做成唯一的排序依据然后把余量藏在角落。

---

## 二、必须严格复用的设计系统（硬约束）

这一页要和现有站点看上去像同一天做出来的。以下 token 直接取自
`frontend/css/unified-theme.css`，**明暗两套都要出稿**。站点用
`<html data-theme="light">` / `dark` 切换，默认深色。

### 颜色 — 深色（默认）

```
品牌主色      --brand          #1978E5     hover #1568CC   pressed #1259B0
蓝图色        --blueprint      #60B0FF     （渐变标题字的第二色）
页面底色      --bg             #0B111B
抬升底色      --bg-elevated    #11192A
卡片          --surface        #161C26
次级面        --surface-2      #1B2433
三级面        --surface-3      #232E3F
边框          --border         #2A3441     强调 --border-strong #3A4757
发丝线        --hairline       rgba(255,255,255,0.06)
正文          --text           #F1F5F9
次要文字      --text-2         #94A3B8
弱文字        --text-3         #7C8CA3
```

### 颜色 — 浅色

```
--bg #F7F9FB   --bg-elevated #FFFFFF   --surface #FFFFFF
--surface-2 #F1F4F9   --surface-3 #E8ECF2
--border #E2E8F0   --border-strong #CBD5E1   --hairline rgba(15,23,42,0.06)
--text #0F172A   --text-2 #475569   --text-3 #64748B
```

### 语义色（明暗不变的主色，soft 底色两套不同）

```
通过 / 合规    --pass    #10B981    深色底 rgba(16,185,129,0.12) 文字 #34D399
                                    浅色底 #ECFDF5 文字 #047857
需注意 / 临时  --review  #F59E0B    深色底 rgba(245,158,11,0.12) 文字 #FBBF24
                                    浅色底 #FFFBEB 文字 #B45309
不通过 / 越界  --fail    #F43F5E    深色底 rgba(244,63,94,0.12) 文字 #FB7185
                                    浅色底 #FEF2F2 文字 #BE123C
品牌 soft      深色 rgba(25,120,229,0.14) 文字 #60B0FF
               浅色 rgba(25,120,229,0.08) 文字 #1259B0
```

### 字体

- 全站 **Inter**（400/500/600/700/800/900），字距 `-0.01em`
- **所有数字（造价、面积、R 值、W/K）一律用等宽** `'JetBrains Mono', 'SF Mono',
  Menlo, Consolas, monospace` —— 这是一张要逐列对比数字的表，比例字体会让它没法读
- 大标题 `font-black`(900) + tracking-tight；小标题上方配一行 kicker：品牌色、
  12px、bold、全大写、字距放宽

### 圆角 / 阴影 / 焦点

```
--r-sm 6px   --r-md 8px   --r-lg 12px   --r-xl 16px   --r-2xl 20px
--shadow-sm  深色 0 1px 2px rgba(0,0,0,.30)      浅色 0 1px 2px rgba(15,23,42,.04)
--shadow     深色 0 2px 6px rgba(0,0,0,.32)      浅色 0 1px 3px rgba(15,23,42,.06)
--shadow-lg  深色 0 20px 40px -12px rgba(0,0,0,.55)
             浅色 0 12px 24px -8px rgba(15,23,42,.10)
焦点环 --focus-ring  0 0 0 3px rgba(25,120,229,0.30)   outline-offset 3px
过渡   --dur 200ms   --ease cubic-bezier(.2,.7,.2,1)
```

### 图标

**Material Symbols Outlined**，20px，与文字 gap 12px。全站都用这一套，不要换。

### 复用的视觉效果

1. **glass-panel**（顶部导航条）：底 `rgba(24,24,27,0.5)` + `backdrop-blur(14px)`
   + 1px `rgba(255,255,255,0.06)` 边框
2. **card-hover**：默认 1px hairline 边框；hover 时边框转
   `rgba(25,120,229,0.35)`、外发光 `0 0 30px -8px rgba(25,120,229,0.2)`、上移 3px
3. **grad-text**：`linear-gradient(135deg,#1978e5,#60b0ff)` 裁进文字，**整页只用
   一次**，用在 H1 最后一行关键词上

### 布局

内容最大宽 **1280px**（max-w-7xl），左右 padding 24px。

**这一页不要 app 侧边栏**——它是免登录的公开工具。用和 `index.html` 同款的**固定
顶部导航条**（高 80px，glass-panel）：左边 `EZbuild` 黑体 + `BETA` 徽章，中间
`Features · How It Works · For Revit · H1 Calculator`（最后一条是当前页，白色高亮，
其余 `--text-2`），右边主按钮 `Get Started →`。滚动超过 30px 时导航底色加深并出现底边线。

---

## 三、画布上要出的 artboard（共 8 块）

按这个顺序在一张画布上排开，桌面宽 1440px：

1. **Inputs — empty**（初始空态）
2. **Inputs — filled**（填好数据，准备计算）
3. **Results — ranked**（核心画面，方案表）
4. **Results — candidate expanded**（展开一个方案看逐项明细）
5. **Hand-off to BRANZ**（粘贴块交接）
6. **State — no compliant combination**
7. **State — out of scope**（Part 1 越界）
8. **Mobile — results**（375px 宽，方案表在窄屏怎么读）

另外把 **Inputs — filled** 和 **Results — ranked** 各出一张**浅色版**。

---

## 四、Artboard 1–2：Inputs

### 页面头部

```
kicker:  NZBC H1/AS1 6TH EDITION · CALCULATION METHOD
H1:      Every compliant specification,
         ranked by what it costs          ← 最后一行用 grad-text
副标题:   The calculation method has no single answer. Enter your envelope once
         and see every combination that complies — cheapest first.
```

### 区块 A —— Project（一行卡片）

四个字段横排：

| 字段 | 控件 | 说明 |
|---|---|---|
| `Territorial Authority` | 可搜索下拉，69 个新西兰议会 | 选中后**右侧立刻显示** `Climate Zone 1` 的品牌色 pill |
| `Project name` | 文本框，选填 | |
| `Designer` | 文本框，选填 | |
| `Date` | 日期，选填 | |

议会下拉的 placeholder：`Search councils…`，示例项：`Auckland`、`Wellington City`、
`Christchurch City`、`Queenstown-Lakes District`、`Invercargill City`。

Climate Zone pill 旁边一行 `--text-3` 小字：

```
Climate zone comes from H1/AS1 Appendix C. Districts that straddle a boundary
follow the map in the standard — override it if yours does.
```

（旁边给一个 `Override` 文字按钮。）

### 区块 B —— Before you start（三个问题，可折叠但默认展开）

这一块**不能做成不起眼的角落**。三个问题任何一个答错，下面算出来的一切都作废。
用 `--surface-2` 底 + 左侧 4px `--review` 竖条。

标题：`Before you start — does H1/AS1 apply to this building?`

三个问题，每个是 Yes / No / 段落输入的三态控件，**默认是「未回答」而不是 No**：

```
1.  How much occupied space is NOT housing?              [ ____ m² ]
    Housing has no area limit. Other buildings are limited to 300 m².  (1.1.1.1 b)

2.  Does the building have curtain walling?              ( Yes ) ( No )
    H1/AS1 does not apply to buildings with curtain walling.  (1.1.2.2)

3.  Does the building use foil insulation anywhere?      ( Yes ) ( No )
    H1/AS1 does not apply to buildings with foil insulation.  (1.1.2.1)
```

**未回答状态的视觉**：控件边框 `--review`，右侧一枚 `--review` 的 `Not answered`
小标签。不要用红色——它不是错误，是还没说。

### 区块 C —— Envelope（主体表格）

一张可增删行的表。列：

```
Assembly name │ Element │ Area (m²) │ Build-up │ Heated? │  ⋮
```

- **Assembly name** —— 文本，如 `Street elevation`、`Other walls`、`Joinery`
- **Element** —— 下拉，七选一，**必须用这七个名字，和 BRANZ 表格逐字一致**：
  `Roof` · `Wall` · `Slab-on-ground floor` · `Other floor` ·
  `Glazing (walls & doors)` · `Opaque door` · `Skylight`
- **Area** —— 数字 + `m²` 后缀，等宽
- **Build-up** —— 三态：`Let EZbuild choose`（默认，品牌色虚线边框）/
  `Pin R-value` / `Restrict to…`（弹出标签选择器）
- **Heated?** —— 开关，默认关。只在 Roof / Wall / 两种 Floor 上可用，其余灰掉

行尾 `⋮` 菜单：`Duplicate` / `Remove`。

底部 `+ Add assembly` 文字按钮，以及一句 `--text-3` 提示：

```
Group by decision, not by surface. Twenty windows that all get the same joinery
are one assembly. A brick-veneer street elevation and weatherboard elsewhere
are two.
```

**表格上方一条测量约定提示条**（`--surface-2` 底，info 图标）：

```
Measure on the finished internal face, using overall internal dimensions and
including internal partitions (2.1.2.10). Roof area excludes skylights. Leave
out any wall or floor between two conditioned spaces — party walls between
units do not belong in the thermal envelope (2.1.2.4).
```

### 区块 D —— Live totals（贴在表格下方，随输入实时更新）

一行三个统计块 + 一个进度条：

```
Gross wall area        Wall glazing            Reference heat loss
169 m²                 20.7%                   298.7 W/K
                       of gross wall area      the budget to beat
```

玻璃占比下面一根细进度条，**40% 处有一道刻度线**。低于 40% 时进度条 `--brand`，
达到或超过时整块转 `--fail`，并出现：

```
Wall glazing is over the 40% of gross wall area that Paragraph 2.1.2.5 allows.
That is a gate, not a trade-off — no amount of insulation elsewhere gets past it.
```

### 主 CTA

整宽主按钮：`Find compliant specifications →`

---

## 五、Artboard 3：Results —— 核心画面

### 顶部结果条

左侧一个大结论块，右侧四个统计：

```
✓  12 compliant specifications found        Climate zone 1 · Auckland
   Cheapest $63,730                          Gross wall 169 m² · glazing 20.7%
                                             Reference heat loss 298.7 W/K
```

结论块用 `--pass-soft` 底 + `--pass` 图标。

### Provisional 横幅（**必须有，不可省略**）

紧贴结果条下方，`--review-soft` 底、左侧 4px `--review` 竖条：

```
Provisional — the H1 figures and the construction catalogue have not yet been
checked by a person. Confirm every value against H1/AS1 6th edition and your
own pricing before relying on this.
```

### 方案表（页面的主角）

```
#  │ Total cost │ Margin  │ Street elevation │ Other walls │ Ceiling │ Joinery │ Slab │
```

用真实数据出稿，**逐字用这些值**：

```
1   $63,730    +1.9 W/K    90mm stud + brick veneer   90mm stud + R2.2 glasswool   R3.6 ceiling batts   Thermally broken, double glazed (Ug 1.1)   Uninsulated slab
2   $66,530   +19.6 W/K    90mm stud + brick veneer   90mm stud + R2.2 glasswool   R6.6 ceiling batts   Thermally broken, double glazed (Ug 1.1)   Uninsulated slab
3   $67,530   +19.0 W/K    90mm stud + brick veneer   140mm stud + R3.6 glasswool  R3.6 ceiling batts   Thermally broken, double glazed (Ug 1.1)   Uninsulated slab
4   $69,750   +22.1 W/K    90mm stud + brick veneer   90mm stud + R2.2 glasswool   R3.6 ceiling batts   Thermally broken, double glazed (Ug 1.1)   Slab with perimeter insulation
```

**Margin 列是这张表的第二根轴，必须做得和造价一样显眼。** 用一根横向小色条表达：

- `< 5 W/K` → `--fail` 色条 + 悬停提示
  `Very little headroom. Any change on site could push this over.`
- `5–15 W/K` → `--review`
- `> 15 W/K` → `--pass`

第 1 行造价最低但余量 `+1.9`，所以它的 margin 条是红的——**这个对比就是这张表存在的
理由，出稿时要让它一眼可见**。

行的其他细节：
- `#1` 行加一枚 `Cheapest` 品牌色 pill
- 余量最大且造价在前三的那行加一枚 `Best headroom` `--pass` pill
- 每行右侧一个 `Select →` 按钮
- 单元格里的做法名如果带 `foil-insulation` 标签，名字后跟一枚 `--fail` 警告图标
- 表格可横向滚动（`overflow-x: auto`），页面本身绝不横向滚动

表格上方一行筛选：`Builder won't do:` 后面跟一排可切换的标签 chip ——
`External insulation` · `Raft slab` · `Brick veneer` · `Deep stud` · `Foil insulation`。
选中即从结果里排除。

### 侧栏 Notes（右侧 360px，或窄屏时移到表格下方）

标题 `What the standard says about this run`，列出后端返回的 notes，每条带条款号
徽章。示例条目：

```
2.1.2.13   No R-value given for Entry door — default R0.18 applied.
2.1.2.12   Held to the heated-element minimums: Slab. Those minimums do not
           apply where the element serves only rooms containing a shower, bath
           or toilet — if that is the case, do not mark it heated.
1.1.2.1    Ranked alongside build-ups that use foil insulation. H1/AS1 does not
           apply to a building with foil insulation anywhere in it.
```

---

## 六、Artboard 4：展开一个方案

点 `Select →` 或行本身，行下方展开一块 `--bg-elevated` 面板，两栏：

**左栏 — Proposed building**，逐项表：

```
Assembly            Element                  Area      R-value   Heat loss   Cost
Ceiling             Roof                     140 m²    R3.6      38.9 W/K    $5,320
Street elevation    Wall                      30 m²    R1.9      15.8 W/K    $4,950
Other walls         Wall                     100 m²    R1.8      55.6 W/K    $8,000
Joinery             Glazing (walls & doors)   35 m²    R0.50     70.0 W/K   $22,400
Entry door          Opaque door                4 m²    R0.45      8.9 W/K    $2,760
Slab                Slab-on-ground floor     140 m²    R1.3     107.7 W/K   $20,300
                                                       Total    296.8 W/K   $63,730
```

**右栏 — Reference building**，说明预算怎么来的：

```
Roof + skylights          140 m²   ÷ R6.6    21.2 W/K
Walls (70% of gross)      118 m²   ÷ R1.6    73.9 W/K
Glazing (30% of gross)     51 m²   ÷ R0.46  110.2 W/K
Slab-on-ground            140 m²   ÷ R1.5    93.3 W/K
                                   Total    298.7 W/K
```

右栏下方一行 `--text-3` 说明：

```
The reference building is always assumed 30% glazed, whatever your building
does (Table 2.1.2.7). A modestly glazed design earns its margin from that gap.
```

底部主按钮：`Take this to the BRANZ workbook →`

---

## 七、Artboard 5：Hand-off to BRANZ

**这一屏的信息层级很重要**：EZbuild 不是合规判定方，BRANZ 的表格才是。设计上不能
让人觉得我们这一页就是结论。

标题区：

```
kicker:  STEP 2 OF 2
H2:      Confirm it in the BRANZ workbook
正文:     EZbuild finds the specification. The BRANZ calculation tool is what
         councils accept, so the document you submit comes from there — and you
         don't have to take our arithmetic on trust.
```

第一步卡片：

```
1.  Download the H1/AS1 6th edition calculation tool from BRANZ
    [ Open BRANZ download page ↗ ]
    Free from branz.co.nz. We don't host a copy — it's their tool.
```

第二步，**每张表一张粘贴卡**（卡片列表）：

```
┌────────────────────────────────────────────────────────────┐
│  Walls                                    [ Copy ]  ✓      │
│  Click cell C10 on this sheet, then paste                  │
│                                                            │
│  Description                    heated?  Area   R-value    │
│  Street elevation — 90mm…         No      30      1.9      │
│  Other walls — 90mm stud…         No     100      1.8      │
└────────────────────────────────────────────────────────────┘
```

卡片头右侧 `Copy` 按钮，点击后变 `✓ Copied` 保持 2 秒。要出的表卡有：
`Roof` · `Walls` · `Slab Floors` · `Glazing (walls & doors)` · `Doors (opaque)`。

门窗类的卡片要**明显留出空列**并标注 `ID` `Height` `Width`，下面一行小字：

```
ID, height and width are left blank — those come from your joinery schedule.
```

第三步，Project Details 是逐格填的，做成一个小表：

```
3.  Type these into the Project Details sheet
    F7    Project name              86 Sartors Ave
    F9    Designer                  EZbuild
    F12   Territorial Authority     Auckland
```

页脚一条 `--surface-2` 提示：

```
Pasting only touches the blue input columns. The workbook's own formulas,
checks and pass/fail result are untouched — it recalculates on open.
```

---

## 八、Artboard 6–7：两个失败状态

### 6. No compliant combination

整块居中空状态，`--fail-soft` 圆形图标底：

```
No combination in your catalogue complies
Either the geometry needs to change, or the catalogue needs build-ups that
reach higher R-values.

Proposed heat loss, cheapest available    312.4 W/K
Reference heat loss (the budget)          298.7 W/K
Short by                                   13.7 W/K
```

下方两个次级按钮：`Adjust the envelope` · `Loosen the builder constraints`。

### 7. Out of scope

**这个状态要压过一切**——它出现时，方案表要么不显示，要么整体降透明度并覆一层。
顶部整宽 `--fail` 横幅：

```
H1/AS1 does not apply to this building

1.1.1.1 b)   450 m² of occupied space is not housing, over the 300 m² limit.
             Use H1/AS2 or H1/VM2 for those parts.
1.1.2.1      H1/AS1 does not apply to buildings with foil insulation — anywhere
             in the building, not just in the elements being traded off here.

Anything calculated below is not a compliance result.
```

最后那句话要显眼。

---

## 九、Artboard 8：Mobile（375px）

方案表在窄屏改成**卡片流**，一个方案一张卡：

```
┌──────────────────────────────┐
│ #1  Cheapest                 │
│ $63,730                      │
│ Margin +1.9 W/K  ▰▱▱▱▱  ← 红 │
│ ──────────────────────────── │
│ Street elevation             │
│   90mm stud + brick veneer   │
│ Other walls                  │
│   90mm stud + R2.2 glasswool │
│ …                            │
│ [ Select → ]                 │
└──────────────────────────────┘
```

输入表格在窄屏也改成一 assembly 一卡。粘贴卡片在手机上把 `Copy` 做成整宽按钮。

---

## 十、不要做的事

1. **不要把我们的结果标成 “PASS” 大绿章。** 合规判定来自 BRANZ 的表格和最终的
   consent 流程，我们给的是「符合计算方法的候选方案」。用 `compliant
   specifications` 这类措辞，不要用 `approved` / `certified` / `guaranteed`。
2. **不要省略 Provisional 横幅**，即使它不好看。
3. **不要把 Before you start 那三个问题折叠成不显眼的小链接。**
4. **不要给数字用比例字体。**
5. **不要自己发明法规条款号或 R 值。** 所有条款号和数值都在本文档里给全了，需要新的
   就留空并标注，不要猜。
6. **不要做 app 侧边栏**——这是免登录页。
7. **不要在任何地方暗示我们托管或分发 BRANZ 的文件。** 措辞一律是「从 BRANZ 下载」。

---

## 十一、稿子交回后的落地步骤（给实施者，不是给 Design）

1. 落成 `frontend/h1-calculator.html`，样式走 `css/unified-theme.css` 的 token，
   不要新建一套变量
2. 新建 `frontend/js/h1-calculator.js`，对接五个已有 endpoint：

```
GET   /api/h1/territorial-authorities     → 议会下拉
POST  /api/h1/calculate                   → 单方案校核（+ scope_findings）
POST  /api/h1/optimise                    → 方案排序（+ scope_findings）
POST  /api/h1/paste-blocks                → BRANZ 粘贴块
POST  /api/h1/export                      → 直接出 xlsx，默认 503，先不接
```

3. `optimise` 的请求体形状：

```json
{
  "territorial_authority": "Auckland",
  "scope": { "non_housing_occupied_space_m2": 0,
             "has_curtain_walling": false, "has_foil_insulation": false },
  "assemblies": [
    { "name": "Street elevation", "element_type": "wall", "area_m2": 30,
      "require_tags": ["brick-veneer"] },
    { "name": "Slab", "element_type": "slab_on_ground_floor",
      "area_m2": 140, "heated": false }
  ],
  "exclude_tags": ["external-insulation"],
  "limit": 12
}
```

   `element_type` 的合法值：`roof` `wall` `slab_on_ground_floor` `other_floor`
   `glazing` `opaque_door` `skylight`

4. 响应里 `candidates[].selections[]` 每项有 `assembly` `name` `area_m2`
   `r_value` `cost` `heat_loss` `tags`；`notes[]` 是要显示在侧栏的文案；
   `scope_findings[]` 每项有 `rule` `status` `message`，`status` ∈
   `in_scope` / `not_stated` / `out_of_scope`
5. 同步改 `index.html` 的导航和 footer，各加一条 `H1 Calculator`
6. 页面加进 `tailwind.config.js` 的 content 扫描后重跑 `npm run build:css`
7. **上线前必须先做完两件事**：把 `backend/src/h1/data/h1_as1_6th.yaml` 的数值
   核对后 `verified: true`，以及给 `constructions.yaml` 填真实做法和材料价——
   否则页面永远显示 Provisional，优化器还会因为没有价格而直接报错
