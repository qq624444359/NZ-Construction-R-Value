> **这是什么**：给 Claude Design 的**第四轮**改稿 prompt，针对 `r-value-configurator-v3`。
>
> **用法**：整段粘进 Design 的现有对话。
>
> **这一轮四件事**：
> 1. **编号断了**：木架没有编号，参数被抽成一条无编号的 `BRIDGED PORTION PARAMETERS`，看起来像新的一节
> 2. **相关字段要放一起**：chord width 和 depth 应该并排，一眼看清要填什么
> 3. **所有数值都要能手填**，heel height / spacing 现在是固定下拉
> 4. **差异化**：加 Headroom 条——改一个部位，其余部位能降到多少立刻算出来。这是竞品没有的东西
>
> 第 4 条的后端已经做好了：`POST /api/h1/headroom`，`backend/src/h1/engine.py` 的
> `headroom()`，有 8 个测试。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第四轮

基于 `r-value-configurator-v3`。前三轮定下的 token、导航、部位选项卡、产品面板、
屋面联动、`—` 占位、2×2 四路径网格、gable 剖切图都保留。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、编号不能断，参数回到各自那层的卡片里

现在 `③ Underlay` `④ Substrate` 之后跳出一条**没有编号**的
`BRIDGED PORTION PARAMETERS`，里面塞了 9 个字段，然后直接到 `⑤ Ceiling lining`。

这有两个问题：

- 那条参数栏字段太多，读者会把它当成**新的一节**，而不是某一层的附属选项
- **木架本身没有编号就被跳过了**。木架空间是一个真实的构造层，它应该**自己就是一节**

### 正确的层序（屋顶，从外到内）

```
·   Outside surface
①   Roofing
②   Underlay
③   Substrate
╔══ BRIDGED PORTION ═══════════════════════════════════╗
║ ④   Roof structure        ← 木架，本身就是一层        ║
║ ⑤   Ceiling insulation                                ║
║ ⑥   Ceiling battens                                   ║
║     …四路径网格…                                      ║
╚═══════════════════════════════════════════════════════╝
⑦   Ceiling lining
·   Inside surface
```

**删掉 `BRIDGED PORTION PARAMETERS` 那一整条。** 每个字段回到它所属的层卡片里：

- chord 尺寸、间距、heel height、roof space → **④ Roof structure** 的卡片
- 保温 R 值和产品选择 → **⑤ Ceiling insulation** 的卡片
- batten 尺寸、间距、cavity → **⑥ Ceiling battens** 的卡片

桥接段容器把 ④⑤⑥ 框住，**2×2 网格是这一段的输出**，放在容器底部，不是一个新 section。
容器里的层卡片和容器外的层卡片用同一种样式和编号规则，只是外面多一圈容器。

这样读者看到的是一条连续编号的层序，桥接只是其中三层被框在一起。

---

## 二、相关字段并排，不要一个一个铺开

现在 `CHORD WIDTH` `CHORD DEPTH` `CHORD SPACING` 是三个平铺的独立字段，中间还夹着
`HEEL HEIGHT`，看不出它们属于同一根构件。

**同一根构件的尺寸并排成一组**，组内用 `×` 连接，组有一个共同的标签：

```
④  Roof structure                      [ Truss ][ Rafter ]

    Bottom chord                          Spacing          Heel height
    ┌──────┐ × ┌──────┐                  ┌──────┐         ┌──────┐
    │  45  │   │  90  │  mm              │ 900  │ mm      │ 200  │ mm
    └──────┘   └──────┘                  └──────┘         └──────┘
     width      depth                     45 ÷ 900 = 5.0%

    Roof space   ☑ Ventilated
```

```
⑥  Ceiling battens

    Batten                                Spacing
    ┌──────┐ × ┌──────┐                  ┌──────┐
    │  45  │   │  45  │  mm              │ 600  │ mm
    └──────┘   └──────┘                  └──────┘
     width      depth                     45 ÷ 600 = 7.5%

    Cavity   [ Empty ][ Insulated ]
```

要点：

- `width × depth` 是**一个字段组**，共用一个标签，两个框之间是 `×`，单位 `mm` 放在组末尾
- `Spacing` 紧跟其后，下方直接显示算式 `45 ÷ 900 = 5.0%`
- **width 下面标注 `width`，depth 下面标注 `depth`**，不要只靠顺序区分
- depth 不参与占比计算，所以不要把算式放在 depth 下面（v3 把 `depth does not set the fraction`
  放在 depth 下方是对的，但位置容易被当成错误提示——改成 width 下方显示算式，depth 下方不写字）

---

## 三、所有数值都要能手填

v3 里 `HEEL HEIGHT` `CHORD SPACING` `BATTEN SPACING` 是固定下拉，只能选预设值。实际项目
里这些尺寸经常不是标准档。

**全部改成数字输入框**，配 `<datalist>` 给常用值做建议，但不限制：

| 字段 | 建议值 |
|---|---|
| Heel height | 90 · 140 · 200 · 250 · 300 |
| Chord / batten width | 45 · 70 · 90 |
| Chord / batten depth | 45 · 70 · 90 · 140 · 190 |
| Chord spacing | 600 · 900 · 1200 |
| Batten spacing | 400 · 450 · 600 |

输入非法值（0、负数、spacing ≤ width）时：输入框转 `--fail` 边框，下方一行说明，
**占比显示 `—` 而不是继续算**。

保温 R 值本来就是数字输入，保持不变。

---

## 四、Headroom —— 这一轮真正重要的东西

到这里为止，这一页和市面上已有的 R 值计算器**功能上没有区别**。区别在这一条。

H1 的 calculation method 允许各部位互相权衡。所以当一个部位定下来之后，**其余部位
各自还能降到多少**是可以精确算出来的，不需要试：参考建筑只取决于几何，是个常数，
于是

```
R_i  ≥  A_i / ( HLreference − 其余部位的 Σ A/R )
```

后端已经实现：`POST /api/h1/headroom`，返回每个部位的 `lowest_r` 和 `binding`。

### 要出的组件：整页顶部一条 Headroom 带

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADROOM · 86 Sartors Ave · Zone 1                    [ Edit envelope ]  │
│  With everything else as specified, each element could go as low as:      │
│                                                                           │
│   Roof      R3.60  →  R3.07                                               │
│   Wall      R2.80  →  R2.45                                               │
│   Glazing   R0.37  →  R0.35                                               │
│   Slab      R1.30  →  R1.22                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

- 当前正在配置的那个部位（这一页是 Roof）**高亮**，其余淡一档
- 箭头右边的值就是 `lowest_r`，等宽字体
- `lowest_r` **低于**当前值 → 箭头和数值用 `--pass`，含义是"还有余量"
- `lowest_r` **高于**当前值 → 用 `--fail`，并把文案换成 `must reach R…`，含义是"现在不合规"
- `binding` 不是 `heat loss` 时，在该行右侧加一枚灰色 chip：
  `Limited by 2.1.2.11` / `Limited by Table 2.1.2.12`
- `lowest_r` 为 `null` 且 `binding` 是 `2.1.2.5` → 整条带换成 `--fail` 状态：
  `Wall glazing is over the 40% limit in Paragraph 2.1.2.5 — no element has headroom until the glazing area comes down.`
- `lowest_r` 为 `null` 且 `binding` 是 `impossible` → 该行显示 `no value complies`

### 联动是重点

**改这一页任何一个输入，Headroom 带都要立刻重算。** 这就是作者要的那个效果：把墙
提到 R2.8，屋顶那一行的 `→ R3.07` 当场变化，不需要点任何"计算"按钮。

用这组真实数字出稿（Auckland zone 1，屋顶 140 m²、墙 130 m²、玻璃 35 m²、地面楼板 140 m²）：

| | 墙 R2.0 时 | 墙 R2.8 时 |
|---|---|---|
| 状态 | **不合规** | **合规** |
| Roof 3.60 → | **R5.17**（--fail，must reach） | **R3.07**（--pass） |
| Wall → | R2.45 | R2.45 |
| Glazing 0.37 → | R0.42（--fail） | R0.35（--pass） |
| Slab 1.30 → | R1.46（--fail） | R1.22（--pass） |

出两张 artboard：**墙 R2.0（红）** 和 **墙 R2.8（绿）**，让这个转变一眼可见。

### 没有整栋楼数据时

这一页可以被单独打开（没有项目上下文）。这时 Headroom 带换成一个引导块：

```
Headroom needs the whole envelope
Enter the building's areas in the H1 calculator and this build-up will show
how far it can drop while the building still complies.
[ Open the H1 calculator → ]
```

**不要为了让页面好看就编一组假的 headroom 数字。**

---

## 五、本轮要出的 artboard（共 5 块，桌面 1440px）

1. **Roof — renumbered stack**（第一、二节：连续编号 + 字段成组）
2. **Roof — headroom, wall at R2.0**（不合规，红）
3. **Roof — headroom, wall at R2.8**（合规，绿）
4. **Roof — invalid input**（spacing 小于 width，占比显示 `—`）
5. **Roof — no project context**（Headroom 引导块）

artboard 1 另出一张浅色版。

---

## 六、不要做的事

1. 不要再出现没有编号的参数区块
2. 不要把 width / depth / spacing 各自铺成一个独立字段
3. 不要用固定下拉限制尺寸——建议值可以有，限制不行
4. 不要编造 headroom 数字；没有整栋楼数据就显示引导块
5. Headroom 高于当前值时不要写成"错误"——那是"这个部位需要达到多少"，用 `must reach`
