> **这是什么**：给 Claude Design 的**修改** prompt，用来把已经出稿的
> "Construction R-value Calculator" 改成分层构造配置器 + 3D 层叠预览。
>
> **用法**：把下面「粘贴给 Claude Design 的说明」整段粘进 Design 的现有画布对话里。
> 它是改稿说明，不是从零重做——开头明确写了哪些要保留。
>
> **两件必须一起改的事**（不改就是错的，不是审美问题）：
> 1. 现在的卡片写 `Requires R6.60 in zone 1` / `BELOW H1` / `Short by R2.33`。
>    第 6 版没有「每个部位必须达到 R6.6」这回事——R6.6 是 Table 2.1.2.7
>    **参考建筑**用的值。Calculation method 的全部意义就是单个部位可以低于它、
>    用别处补回来。照现在的写法，工具会逼用户把屋顶做到 R6.6，正好和产品目的相反。
> 2. kicker 写着 `SCHEDULE METHOD`。第 6 版「Main changes」第一条就是
>    *"The schedule method has been removed from the acceptable solution."*
>    它只能靠第 5 版 amendment 1 用到 **2026-11-26**。
>
> **后端现状**：这一页目前**没有任何后端**。已建好的 `backend/src/h1/` 是 Layer 2
> （整栋楼合规 + 方案排序），不含分层 R 值计算。这一页要的是 Layer 1，需要新建：
> NZS 4214 isothermal planes 计算、构造层材料库、屋面 profile↔underlay 兼容表、
> truss heel height 表。出完稿再谈后端。
>
> 相关：[原始说明书](for-h1-calculator.md) · [H1 引擎](../../backend/src/h1/engine.py)

---

# 粘贴给 Claude Design 的说明 —— R-value Calculator 改稿

这是对你已经做好的 **Construction R-value Calculator** 的修改，不是重做。

全站文案是英文，**页面上所有可见文字必须用英文**。下面给出的 copy 请逐字使用——
其中很多是法规条款的转述，改一个词就可能变成错误的合规陈述。

---

## 一、保留不动的部分

这些已经做对了，不要改：

- 整套深色 / 浅色 token、Inter 字体、Material Symbols 图标、圆角与阴影
- 顶部导航条（`EZbuild` + `BETA`，右上角主题切换）
- 页面头部的 kicker / 大标题 / 副标题**版式**（文案要改，见下）
- 右上角的 **Climate Zone** 下拉
- **五个部位选项卡**：`Roof / ceiling` · `Wall` · `Suspended floor` ·
  `Slab on ground` · `Window & door`，以及它们「未计算 / 已算出 R 值」两种状态
- 右下角的 **Insulation products** 面板（点击即套用到当前高亮层）
- 数字用等宽字体

---

## 二、必须改掉的三处（合规正确性，不是审美）

### 1. kicker

```
改前：  NZBC H1/AS1 · SCHEDULE METHOD · NZS 4214 ISOTHERMAL PLANES
改后：  NZBC H1/AS1 6TH EDITION · CONSTRUCTION R-VALUE · NZS 4214
```

### 2. 部位卡片上的对比文字

`Requires R6.60 in zone 1` 这种写法要**全部删掉**。第 6 版没有逐部位的最低 R 值
要求。每张卡片改成两行：

```
R4.27
Reference building uses R6.60 here          ← --text-3，中性措辞，不是"要求"
Minimum R2.60 · meets it ✓                  ← --pass；低于时才转 --fail
```

### 3. 不合格提示

红色框 `Short by R2.33 — increase the insulation or change the build-up` 删掉，
换成一个**中性的对照块**：

```
R4.27  is  R2.33  below the reference building's R6.60.

Under the calculation method that is allowed — the shortfall can be made up
by other elements. What it cannot go below is R2.60 (Paragraph 2.1.2.11).

[ Take this to the H1 calculator → ]
```

只有当 R 值真的低于 **2.1.2.11** 的硬下限时，才用 `--fail` 和这句：

```
Below the R2.60 minimum that Paragraph 2.1.2.11 sets for roofs. No trade-off
against other elements can rescue this.
```

硬下限：**Roof R2.60 · Wall R1.00 · Suspended floor R1.30**。
Slab on ground 和 Window & door **没有**硬下限——那两张卡不要显示这一行。

---

## 三、主体改造：左侧分层配置 + 右侧 3D 层叠

把现在的「Construction detail 下拉 + Layers 平表」换成**左右两栏**：
左栏 **7 : 5** 右栏。

### 右栏 —— 3D 层叠预览（新增，这一页的主角）

一个**爆炸轴测图**（exploded axonometric）：

- 视角约 **25° 俯角 / 30° 偏转**，各层沿 Y 轴拉开约 28px 间距
- 每层画成一块有厚度的板，厚度**按真实构造厚度成比例**（0.55mm 的金属板就该是薄薄
  一条，290mm 的保温棉就该是厚厚一块）——这是这张图的信息价值所在
- 金属屋面那层要画出**波形**：Corrugate 是圆弧波，Trapezoidal 是梯形折角，
  选项一换图形就跟着换
- 木结构层画出 **truss 下弦 / rafter** 的断面阵列，间距按所选值
- Ceiling batten 层画出与下弦**垂直交叉**的方向
- 保温层用半透明填充，能透出下面的结构 —— 让"保温被 batten 打断"这件事看得见
- 每层右侧一个引出标签：层名 + 该层 R 值（等宽）
- **左栏选中某层时，右栏对应层高亮**（品牌色描边 + 轻微上浮），其余层降到 40% 不透明
- 左下角一枚 orbit 控件：可拖拽旋转的圆形手柄 + `Reset view` 文字按钮
- 右上角三个视图切换 chip：`Exploded` · `Assembled` · `Section`

**实现说明（给后续落地的人，不用画进稿子）**：用 CSS 3D transform 做，每层一个
`transform: rotateX() rotateY() translateZ()` 的平面，容器上挂拖拽改变角度。
不需要 Three.js。

### 左栏 —— 分层配置器（改造现有的 Layers 表）

不再是一张只读表，而是**从外到内的可配置层堆栈**。每层一张可折叠的行卡：

```
┌─────────────────────────────────────────────────────────┐
│ ▏ ①  Roofing                                  R0.00     │   ← 左侧 4px 品牌色条
│    [ Corrugate ▾ ]  0.55 mm steel                       │
└─────────────────────────────────────────────────────────┘
```

行卡的构成：序号 · 层名 · 该层控件 · 右对齐的该层 R 值（等宽）。
选中的行卡：`--surface-3` 底 + 品牌色左条 + 右栏同步高亮。

---

## 四、Roof / ceiling 的层堆栈（逐层规格）

**从外到内**，共 8 层。这是本次改稿要出的主要内容。

### ① Roofing

下拉：`Corrugate` · `Trapezoidal (5-rib)` · `Tray / standing seam` ·
`Concrete tile` · `Pressed metal tile`

副文字：`0.55 mm steel` 之类的规格，随选项变。

### ② Underlay

下拉，**选项随 ① 的 profile 变**——这是本页要表达的第一个依赖关系。
当 ① 改变时，这一层的下拉要有一次轻微的高亮闪动，并在下方出现一行提示：

```
Self-supporting underlay is required over purlins with this profile.
```

选项示例：`Self-supporting synthetic underlay` · `Non-self-supporting fabric` ·
`Bituminous roofing paper`

### ③ Substrate

下拉：`None — purlins only` · `17 mm plywood` · `12 mm plywood` ·
`Rigid air barrier board`

选 `None` 时，这一层在右栏 3D 里**不绘制**，左栏行卡降为紧凑的一行灰字。

### ④ Structure

分段控件二选一：`Truss` | `Rafter`

**选 Truss 时**，展开两个子控件：

```
Bottom chord depth   [ 90 mm ▾ ]
Heel height          [ 90 · 140 · 200 · 250 · 300 mm ]   ← 分段按钮
```

**选 Rafter 时**：

```
Rafter depth         [ 140 · 190 · 240 mm ]
Insulation between rafters   ( on / off )       ← skillion 做法
```

### ⑤ Roof space

只在 ④ = Truss 时出现。开关 `Ventilated roof space`，默认开。
关掉时右栏 3D 收起这一层的间隙。

### ⑥ Ceiling insulation

这是主控层。R 值输入框 + `Pick product →`，与右下角产品面板联动（保留现有交互）。
输入框下方一行显示推算厚度：

```
R6.60 · 290 mm blanket
```

**⚠️ 这一层和 ④ 的 heel height 之间有依赖，是本页最重要的一个交互**，见第五节。

### ⑦ Ceiling battens

```
Spacing              [ 600 mm ▾ ]
Batten cavity        ( Empty / Insulated )
```

选 `Insulated` 时展开一个附加 R 值输入。副文字：

```
Battens run across the bottom chord, so insulation here is not bridged by
the same framing — it counts more than its nominal R-value suggests.
```

### ⑧ Ceiling lining

下拉：`13 mm plasterboard` · `10 mm plasterboard` ·
`13 mm fire-rated plasterboard` · `Timber sarking`

（表面空气膜 `Inside surface` / `Outside surface` 仍然要在层表里出现，但做成**不可配置
的灰色紧凑行**，只显示 R 值。）

---

## 五、Heel height ↔ 保温厚度：本页最重要的交互

这是真实工地上最常出错的地方，也是竞品完全没做的：**檐口处 truss 的 heel height
不够高时，保温棉在周边被压扁，那一圈的 R 值达不到中间的水平。**

当 **⑥ 的保温厚度 > ④ 的 heel height** 时：

1. 右栏 3D 的保温层在**周边一圈**渲染成被压扁的楔形，并标注宽度 `500 mm`
2. 左栏 ④ 和 ⑥ 两张行卡同时亮起 `--review` 左条
3. 在两层之间插入一块 `--review-soft` 的提示卡：

```
290 mm of insulation will not fit in a 90 mm heel.

H1/AS1 allows the roof R-value to drop to R3.30 for up to 500 mm in from the
ceiling perimeter where space restricts full-thickness insulation
(Table 2.1.2.12, note 4). It may never go below R2.60 anywhere, including at
the perimeter (2.1.2.11 a).

Perimeter strip at this heel height     R2.10   ← 低于 R2.60 时 --fail
Raise the heel to 200 mm                R3.40   ← --pass，给出可行解
```

最后那一行要做成一个**可点击的建议**——点了就把 heel height 改到 200mm。

如果周边条 R 值落在 R2.60 和 R3.30 之间：用 `--review`，文案改成
`Within what note 4 allows, but document the perimeter detail.`

---

## 六、右上角的 R 值结论块（改造现有的）

保留现在的大数字 + 进度条形态，但改掉刻度和文案：

```
ROOF / CEILING · CONSTRUCTION R-VALUE

        4.27
       m²·K/W

├──────────●─────────────────────┤
R2.60          R4.27        R6.60
minimum                     reference

Framing fraction 12% · isothermal planes per NZS 4214
```

进度条上要有**两道刻度**：`R2.60`（硬下限，`--fail` 色刻度）和 `R6.60`
（参考建筑值，`--text-3` 色刻度）。当前值落在两者之间时进度条用 **`--brand`**，
不是红色——**它不是不合格**。

低于 R2.60 时才转 `--fail`。

下方补一行 framing fraction，因为这是 NZS 4214 计算的关键输入，用户必须看得见。
墙体那一页这里要显示 `Framing fraction 38% (H1/AS1 default)`，并给一个
`Calculate from wall geometry →` 的次级按钮。

---

## 七、另外两个部位不是层堆栈，不要套同一个形态

- **`Slab on ground`** —— 第 6 版用 **Appendix E** 的查表法，输入是周长、面积、
  保温位置和厚度，不是构造分层。这张卡片下改成一组几何输入 + 一张小示意剖面图。
- **`Window & door`** —— 用 **Table D.1.1.1** 查表：`Glazing type`（Double / Triple）
  × `Ug` × `Frame material`（Aluminium / Thermally broken aluminium / uPVC / Timber）。
  做成一个 **4 列的可点选矩阵**，选中格子高亮并回填 R 值。不要做层堆栈。
  下方注明：`Opaque doors and skylights have no lookup table — they are
  calculated per H1/VM1 Appendix D and ISO 10077-1.`

这两个在本次改稿里各出一张 artboard 即可，不用做到 Roof 那么细。

---

## 八、本次要出的 artboard（共 6 块，桌面 1440px）

1. **Roof — configured**（8 层全部展开，右栏 3D 爆炸图，主画面）
2. **Roof — heel height conflict**（第五节那个交互全开）
3. **Roof — 3D assembled view**（`Assembled` 视图切换后的样子）
4. **Wall — configured**（层堆栈 + framing fraction 38% 那一行）
5. **Window & door — matrix**（Table D.1.1.1 的选择矩阵）
6. **Mobile — roof**（375px：3D 在上、层堆栈在下，层卡改为整宽）

其中 artboard 1 另出一张**浅色版**。

---

## 九、不要做的事

1. **不要写「Requires Rx.xx」这类措辞**，不要用 `BELOW H1` 这种徽章。第 6 版里
   逐部位的要求只有 2.1.2.11 那三个硬下限。
2. **不要出现 `Schedule method`。** 它已从第 6 版删除。
3. **不要把低于参考值渲染成失败状态**——那是这个产品要卖的自由度。
4. **不要自己发明条款号、R 值或构造做法名。** 本文档给全了需要的；缺的就留空标注。
5. **不要让 3D 图变成装饰。** 每层的厚度、波形、间距都要承载信息；做不出信息价值的
   花哨效果不如不要。
6. **不要给数字用比例字体。**
