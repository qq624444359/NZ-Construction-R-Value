> **这是什么**：给 Claude Design 的**第十二轮**改稿 prompt，只改 ④ Roof framing 里
> 左右两栏的内容。
>
> **用法**：整段粘进 Design 的现有对话。
>
> **这一轮两件事**：
> 1. 两栏的面积占比降成小字说明，不再是大号高亮结果
> 2. `THROUGH THE INSULATION` 从"三个做法按钮 + 两组输入"改成**一张保温层列表 + 一个 `+`**
>
> **参考**：作者给了一个同类工具的截图（屋顶构造类型下拉 + 框架/空腔面积占比的小字标注）。
> 它的选项清单说明了用户实际要选的就是四种情况：普通平天花、檐口压缩、框架上/下加层、
> 檐口 + 框架下加层。**只借这个选项结构，不借它的文案、排版和算法**——那个工具标明了
> 不得复制。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第十二轮

前十一轮的内容全部保留，除了下面明确替换的部分。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、面积占比：小字说明，两栏对称

现在木头卡里是大号 `= 5.0% timber`，保温卡里是大号 `= 95.0% insulation`。占比是
**背景信息**，不是这一栏要用户操作的东西，不该和输入抢视线。

改成放在**两栏表头的右侧**，`--ink-3` 小字：

```
THROUGH THE TIMBER          Frame area 5.0%  │  THROUGH THE INSULATION      Cavity area 95.0%
```

- 两边字号、颜色完全一样，不用 `--brand`，不加粗
- 悬停 `Frame area 5.0%` 显示算式 tooltip：`45 mm ÷ 900 mm centres`
- 悬停 `Cavity area 95.0%` 显示：`100% − 5.0% frame area`
- 木头卡里只剩：`Bottom chord` / `90 mm timber` / `R—`，删掉原来那两行算式
- 保温卡里删掉 `100% − 5.0% = 95.0% insulation` 那两行
- ⑤ Ceiling battens 照同样处理：`Batten area 7.5%` / `Cavity area 92.5%`

---

## 二、THROUGH THE INSULATION：一张层列表 + 一个 `+`

### 为什么改

现在这一栏有 `Two layer / Single layer, notched / Single layer, fills depth` 三个按钮，
加上 `BETWEEN THE MEMBERS`、`OVER THE MEMBERS` 两组输入、一行说明、一个黄色 CTA。
用户真正想知道的只有一件事：**这里铺了几层保温，分别是什么。**

### 默认状态：单层

```
THROUGH THE INSULATION                              Cavity area 95.0%
┌────────────────────────────────────────────────────────────────┐
│ ▤  Between the members        R2.6 · 110 mm  🔒         ⋯     │
│    Fills the 90 mm chord                                        │
└────────────────────────────────────────────────────────────────┘
 [ + ]
```

- 每一层是一行：左边一个小色块（和剖面图里这一层的填充一致）、层名、产品、`⋯` 菜单
- `⋯` 菜单：`Choose another product` · `Remove`（`Between the members` 不能删，没有 Remove）
- 行下面一行 `--ink-3` 说明，只在有用时出现
- 选中某一行（点击）= 右栏产品表点击时填入这一行，选中行有 `--brand` 左边线

### `+` 菜单

点 `+` 弹出菜单，四项：

```
Add a layer over the framing        Runs unbroken over the chords
Notch it over the chords            One blanket, cut to sit over the chords
Insulate between the battens        Fills the cavity in ⑤
Add the roof perimeter              The squashed strip at the eaves
```

各项加上去之后的样子：

**Add a layer over the framing** → 多一行：
```
▤  Over the framing              R3.6 · 180 mm            ⋯
   Shared by every heat path
```
顶部 `SHARED ACROSS ALL PATHS` 里的 `Ceiling insulation over the framing · 180 mm`
同时出现，**只读**，点它滚回这一行。

**Notch it over the chords** → 原来的单行换成一行：
```
▤  Single layer, notched         R7.0 · 275 mm            ⋯
   Cut to sit over the 90 mm chord
```
和 `Add a layer over the framing` **互斥**：一个已加上时，另一个在菜单里置灰并提示
`Remove the layer over the framing first` / `Remove the notch first`。

**Insulate between the battens** → 多一行：
```
▤  Between the battens           R— · 45 mm               ⋯
   In ⑤ Ceiling battens
```
这一行和 ⑤ 的 `Batten cavity` 是**同一个状态**：在这里加，⑤ 自动变 `Insulated`；
在 ⑤ 切回 `Empty`，这一行消失。两边改哪边都行。

**Add the roof perimeter** → 多一行：
```
▤  Roof perimeter                R2.7 · 100 mm · 500 mm   ⋯
   Opens the perimeter panel
```
同时展开 ⑥ Roof perimeter 面板。**原来那个黄色 `Still not passing? Add the roof perimeter
allowance` CTA 删掉**，由这一项代替。

已经加上的项在菜单里显示 ✓ 并置灰。

### 列表的顺序

按剖面图从上到下排：`Over the framing` → `Between the members` / `Single layer, notched`
→ `Between the battens`，`Roof perimeter` 永远在最后并用一道细线隔开（它是檐口带，
不是天花层序里的一层）。

### 删掉的东西

- `Two layer / Single layer, notched / Single layer, fills depth` 三个按钮
- `BETWEEN THE MEMBERS` / `OVER THE MEMBERS` 两个小标题和它们的输入组
- `185 mm over them → shared across every path` 那行
- 黄色 perimeter CTA

第七、八轮的规则**照旧生效**，只是换了触发位置：
- 下层产品由弦深 + 20 mm 从产品表带出（🔒），可以换 → 显示 `Custom` + `--review`
- 单层（非 notched）比弦深厚 → ballooning `--review`，显示在那一行下面
- 三种做法仍然是**同一个四路径模型**，不要因为列表不同画出不同的网格

---

## 三、剖面图跟着列表变

右栏剖面图是 sticky 的，一直在视野里。列表每一次增减，剖面图同步：

- **加一层** → 剖面图里这一层从 0 淡入并在自己的位置"长出来"（200 ms），加 `--brand`
  描边高亮 1.5 秒后恢复
- **删一层** → 淡出（150 ms）
- **Notch** → 画出保温跨过下弦的切口
- **Perimeter** → 檐口那一段 500 mm 带高亮，并显示第八轮的深度标注
- 悬停列表里某一行 → 剖面图里那一层高亮、其余 40%（第八轮规则）

`data-layer` 拆开，一层一个 id：

| 列表行 | `data-layer` |
|---|---|
| Over the framing | `insulation-over` |
| Between the members | `insulation-between` |
| Single layer, notched | `insulation-notched` |
| Between the battens | `insulation-battens` |
| Roof perimeter | `perimeter` |

原来笼统的 `insulation` 不再用。

---

## 四、本轮要出的 artboard（共 5 块，桌面 1440px）

1. **Insulation — single layer**（默认，一行 + `+`，两栏表头小字占比）
2. **Insulation — `+` menu open**（四项，说明文字在右）
3. **Insulation — over the framing added**（两行，shared 区出现只读行，剖面图该层刚高亮）
4. **Insulation — notched + perimeter**（notched 一行、perimeter 在细线下，`Add a layer over
   the framing` 在菜单里置灰）
5. artboard 1 的浅色版

---

## 五、不要做的事

1. 不要把面积占比做成大号或品牌色
2. 不要保留三个做法按钮，做法由列表里有哪几行决定
3. `Add a layer over the framing` 和 `Notch it over the chords` 不能同时存在
4. `Between the battens` 和 ⑤ 的 `Batten cavity` 不能是两个独立状态
5. 不要照搬参考截图里那个工具的文案、表格样式和压缩计算
