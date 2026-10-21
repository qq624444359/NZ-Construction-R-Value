> **这是什么**：给 Claude Design 的**第九轮**改稿 prompt，针对 `r-value-configurator-v5`。
>
> **用法**：整段粘进 Design 的现有对话，接在[第八轮](for-h1-rvalue-calculator-revision-8.md)之后。
>
> **这一轮一件主事**：Ceiling battens 从 ④ Roof framing 里拿出来，成为独立的
> **⑤ Ceiling battens**，放在 ④ 和 Ceiling lining 之间。
>
> **有一条计算上的约束，拆的时候必须守住**：batten 和下弦是**相邻的两层框架**，按
> H1/AS1 **2.1.3.2** 它们要**合在一起**算四条交叉路径（后端 `cross()` 就是这么做的）。
> 如果 ④ 和 ⑤ 各自算完再相加，结果会偏低（示意数值下偏低约 R0.06）。
> 所以这一轮是**显示上拆开，计算上不拆**——四路径网格从 ④ 里移出来，放在 ⑤ 下面，
> 同时用一道括线把 ④ ⑤ 连起来。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第九轮

前八轮定下的 token、层编号样式、木架层标题、两栏路径、表盘单阈值、手填数值、屋面联动、
右栏常驻剖面图与悬停联动、`—` 占位都保留。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、Ceiling battens 独立成 ⑤

现在 `Ceiling battens` 和 `Batten cavity` 是 ④ Roof framing 里左右两栏的第二行。
作者希望它是**层序里单独的一层**：看层序就能读出 桁架 → batten → 天花板。

### 新的层序

```
①  Roofing
②  Underlay
③  Substrate
④  Roof framing          ┐
⑤  Ceiling battens       ┘ Bridged together
⑥  Ceiling lining
   Inside surface resistance
```

Ceiling lining 由 ⑤ 变成 **⑥**。

### ⑤ 的样子 —— 和 ④ 用同一套结构

```
┌───────────────────────────────────────────────────────────────────────┐
│ 🪵 ⑤  Ceiling battens                                            R—   │
│      Battens fixed under the chords, with a cavity between them       │
│                                                                        │
│      Batten ┌──┐×┌──┐mm   Spacing ┌───┐mm                              │
│             │45│ │45│             │600│                                │
│             └──┘ └──┘             └───┘                                │
│             width depth        45 ÷ 600 = 7.5%                         │
│ ─────────────────────────────────────────────────────────────────────  │
│   THROUGH THE BATTEN          │   THROUGH THE CAVITY                   │
│   Ceiling battens      7.5%   │   Batten cavity               92.5%    │
│   45 mm timber           R—   │   [ Empty ][ Insulated ]          R—   │
└───────────────────────────────────────────────────────────────────────┘
```

要点：

- **标题区的结构和 ④ 完全一样**：木材图标、编号、名字、一句副标题，尺寸和间距放在标题区，
  算出的占比 `45 ÷ 600 = 7.5%` 跟在下面
- 同样的 3px 暖色木材竖条——④ 和 ⑤ 都是框架层，用同一种标识
- 下面左右两栏，**栏线和 ④ 的栏线对齐在同一条竖线上**：左边永远是木头，右边永远是
  保温/空腔，从 ④ 看到 ⑤ 视线不用跳
- 两栏表头：`THROUGH THE BATTEN` / `THROUGH THE CAVITY`
- `Batten cavity` 选 `Insulated` 时，右边那张卡展开 R 值 + 厚度两个输入框（手填，和其他
  保温输入一样）；选 `Empty` 时只显示 `R—`，**不要自动给空腔一个 R 值**
- 两张卡的占比加起来必须是 100.0%

### ④ 相应变瘦

④ Roof framing 里只剩：

```
标题区（Truss/Rafter、Bottom chord、Spacing、Roof space）
SHARED ACROSS ALL PATHS
THROUGH THE TIMBER: Bottom chord    │  THROUGH THE INSULATION: Ceiling insulation
```

`Ceiling battens` 和 `Batten cavity` 两张卡从 ④ 删掉。左栏 Bottom chord 下面
会空出一大块——**不要用别的东西填它**，左栏卡片高度按内容走即可。

---

## 二、④ 和 ⑤ 之间的连接：一道括线 + 一张共用网格

拆开之后，用户会以为 ④ 和 ⑤ 各算各的。必须在视觉上说清楚它们是一起算的。

### 左侧括线

在 ④ 和 ⑤ 左边、编号圆圈外侧，画一道竖向括线，从 ④ 顶部连到 ⑤ 底部：

```
  ┌ ④  Roof framing        …
  │
  │
  │ ⑤  Ceiling battens     …
  └
    FOUR HEAT-FLOW PATHS · ④ × ⑤
```

- 括线 2px，木材暖色，和两层的竖条同色
- 括线中段放一枚竖排或横排的小 chip：`BRIDGED TOGETHER`，配 info 图标，悬停显示：
  `The chords and the battens are adjacent framing layers, so the standard
  combines them into four heat paths rather than adding them one after the
  other (H1/AS1 2.1.3.2).`
- 原来 ④ 标题旁的 `BRIDGED PORTION` chip **移到这道括线上**，④ 标题旁不再放

### 四路径网格移到 ⑤ 下面

原来在 ④ 底部的 `FOUR HEAT-FLOW PATHS` 网格和公式行，整块移到 **⑤ 的下面、⑥ 的上面**，
作为括线的收尾：

```
FOUR HEAT-FLOW PATHS · ④ × ⑤
                           ⑤ Batten 7.5%     ⑤ Cavity 92.5%
④ Bottom chord  5.0%        0.4%   R—          4.6%   R—
④ Insulation   95.0%        7.1%   R—         87.9%   R—

1/Rb = 0.004/R— + 0.046/R— + 0.071/R— + 0.879/R—        COMBINED  R—
[ How the 5.0% × 7.5% split is worked out ⌄ ]
```

- 行来自 ④，列来自 ⑤，**行列表头写明编号**，一眼看出这是两层的交叉
- `COMBINED R—` 是 ④ ⑤ 合起来的桥接段 R 值；④ 和 ⑤ 标题右上角的 `R—` 保留，但悬停
  显示 `Part of the combined value below — not added separately.`
- 网格只出现**一次**，不要在 ④ 和 ⑤ 里各放一份

---

## 三、剖面图联动

`data-layer` 对照表更新：

| 左栏行 | `data-layer` | 剖面图里的组 |
|---|---|---|
| ④ Roof framing → Bottom chord | `chord` | 下弦 |
| ④ → Ceiling insulation | `insulation` | 保温填充 |
| ④ → Roof space | `roofspace` | 屋顶空腔 |
| **⑤ Ceiling battens**（整层，含两张卡） | `battens` | 交叉的 batten |
| ⑥ Ceiling lining | `lining` | 天花板 |

其余行不变。悬停**括线或网格**时，`chord` 和 `battens` 两组同时高亮——这正是"一起算"
的那两层。

### 顺手修：剖面图没有常驻

v5 里左栏往下滚到 ⑤ 时，右栏剖面图的标题已经滚出屏幕（只剩下半张图）。第八轮要求的是
`position: sticky; top: 88px` 一直完整可见。常见原因是右栏容器的高度只等于自己的内容，
sticky 到容器底就停了——**右栏那一列要撑满整个左栏的高度**（grid 默认的 stretch，不要给
右栏列设 `align-self: start`），sticky 放在列里面的面板上。

---

## 四、顺手修：保温那张卡的数字对不上

v5 截图里 ④ 的 `Ceiling insulation` 卡同时出现了这几个数：

- 标题下：`R3.60 · 90 mm between members`
- `BETWEEN THE MEMBERS`：R `3.6`，厚度 `175` mm
- `OVER THE MEMBERS`：R `2.2`，厚度 `100` mm
- 下方文字和 shared 区：`185 mm over them`

三处厚度互相矛盾。按第七轮的 Two layer 规则：

- `BETWEEN THE MEMBERS` 的厚度**由下弦深度带出**：90 mm 弦 → `110` mm（只读，改 ④ 的
  depth 它跟着变）。不能是 175
- `OVER THE MEMBERS` 的厚度就是用户在那里填的数，下方文字和 shared 区那一行**直接引用
  这个输入**：填 100 就写 `100 mm over them`
- 标题下那行摘要也引用同一组输入，不要另写一个数

---

## 五、本轮要出的 artboard（共 4 块，桌面 1440px）

1. **Roof — battens as their own layer**（④ ⑤ 分开、括线、网格在 ⑤ 下面，⑥ Ceiling lining）
2. **Roof — hover on ⑤**（左栏 ⑤ 高亮，右栏剖面图 batten 高亮、其余 40%，剖面图完整可见）
3. **Roof — batten cavity insulated**（⑤ 右卡展开 R 值和厚度输入）
4. artboard 1 的浅色版

---

## 六、不要做的事

1. 不要让 ④ 和 ⑤ 各自算出 R 值再相加——它们是一个桥接段，只有网格底部那一个 `COMBINED`
2. 四路径网格只放一份，在 ⑤ 下面
3. 不要给 `Batten cavity` 编号，它是 ⑤ 的另一条路径
4. 不要给空的 batten 空腔自动填 R 值
5. ④ 左栏空出来的位置不要塞别的内容
6. 保温厚度只有一个来源：下层由弦深带出，上层由输入框决定，其他地方都引用它们
