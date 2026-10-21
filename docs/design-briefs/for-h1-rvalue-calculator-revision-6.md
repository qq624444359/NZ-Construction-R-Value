> **这是什么**：给 Claude Design 的**第六轮**改稿 prompt，针对 `r-value-configurator-v4`
> 的桥接段排版。
>
> **用法**：整段粘进 Design 的现有对话。
>
> **这一轮两件事**：
> 1. 桥接段改成**左右两栏：左边木架，右边保温**（作者提的，而且它正好就是这个方法的物理结构）
> 2. 左右分栏会暴露一个现在被藏住的问题：**下弦深 90 mm，保温却是 175 mm**，两条路径不等厚
>
> 第 2 条的后端已经做好了：`split_over_framing()`，`backend/src/h1/rvalue/engine.py`，6 个测试。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第六轮

只改桥接段内部的排版。层编号、字段成组、手填数值、四路径网格、表盘、gable 图都保留。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、桥接段改成左右两栏

现在 ④ Roof structure、⑤ Ceiling insulation、⑥ Ceiling battens 是上下堆叠的三张卡。
但它们在构造上不是上下三层——**④ 和 ⑤ 处在同一个深度**：弦之间是保温，弦本身是木头，
这是同一个平面上的两种东西。⑥ 和它右边的空腔也一样。

这正是 isothermal planes 的两条并联路径。左右分栏之后，下面那张 2×2 网格就是这两栏
的交叉，读起来是连贯的。

```
╔══ BRIDGED PORTION ══════════════════════════════════════════════════╗
║  SHARED ACROSS ALL PATHS                                            ║
║    Roof space · ventilated                                    R—    ║
║    Ceiling insulation over the framing · 85 mm                R—    ║
║ ─────────────────────────────────────────────────────────────────── ║
║   THROUGH THE FRAMING            │   THROUGH THE INSULATION         ║
║ ┌────────────────────────────┐   │ ┌──────────────────────────────┐ ║
║ │ ④ Roof structure      5.0% │   │ │ ⑤ Ceiling insulation   95.0% │ ║
║ │   [ Truss ][ Rafter ]      │   │ │   Declared R-value           │ ║
║ │   Bottom chord             │   │ │   ┌─────┐                    │ ║
║ │   ┌────┐ × ┌────┐ mm       │   │ │   │ 3.6 │  R-value           │ ║
║ │   │ 45 │   │ 90 │          │   │ │   └─────┘                    │ ║
║ │   └────┘   └────┘          │   │ │   175 mm at this R-value     │ ║
║ │    width    depth          │   │ │   90 mm between the members  │ ║
║ │   Spacing ┌─────┐ mm       │   │ │   85 mm over them → shared   │ ║
║ │           │ 900 │          │   │ │                          R—  │ ║
║ │           └─────┘          │   │ └──────────────────────────────┘ ║
║ │   45 ÷ 900 = 5.0%          │   │                                  ║
║ │   Heel height ┌─────┐ mm   │   │                                  ║
║ │               │ 200 │      │   │                                  ║
║ │               └─────┘  R—  │   │                                  ║
║ └────────────────────────────┘   │                                  ║
║ ┌────────────────────────────┐   │ ┌──────────────────────────────┐ ║
║ │ ⑥ Ceiling battens     7.5% │   │ │   Batten cavity        92.5% │ ║
║ │   ┌────┐ × ┌────┐ mm       │   │ │   [ Empty ][ Insulated ]     │ ║
║ │   │ 45 │   │ 45 │          │   │ │                          R—  │ ║
║ │   └────┘   └────┘          │   │ └──────────────────────────────┘ ║
║ │    width    depth          │   │                                  ║
║ │   Spacing ┌─────┐ mm       │   │                                  ║
║ │           │ 600 │          │   │                                  ║
║ │           └─────┘          │   │                                  ║
║ │   45 ÷ 600 = 7.5%      R—  │   │                                  ║
║ └────────────────────────────┘   │                                  ║
║ ─────────────────────────────────────────────────────────────────── ║
║  FOUR HEAT-FLOW PATHS       …2×2 网格…            Combined    R—    ║
╚═════════════════════════════════════════════════════════════════════╝
```

要点：

- 两栏表头 **`THROUGH THE FRAMING`** / **`THROUGH THE INSULATION`**，品牌色 kicker，
  说明这两栏是两条热流路径，不是两组设置
- 两栏之间一道 1px `--hairline` 竖线，从表头一直贯到网格之前
- **面积占比放在每张卡片的右上角**，和卡片标题同一行：木架 5.0%、保温 95.0%、
  batten 7.5%、空腔 92.5%。左右两张卡的占比必然加起来是 100.0%
- `Batten cavity` 那张卡**没有编号**——它不是新的一层，它是 ⑥ 的另一条路径
- 右栏两张卡的高度不需要和左栏对齐，右栏内容本来就少
- 顶部 `SHARED ACROSS ALL PATHS` 区保留，但现在**通常有两项**（见第二节）

---

## 二、保温比下弦深时，要拆开

v4 现在同时显示 `chord depth 90 mm` 和 `175 mm at this R-value`，中间没有任何说明。
但 **175 mm 的保温棉装不进 90 mm 深的弦之间**——多出来的 85 mm 是连续盖在木头上面的。

这件事必须显示出来，因为 isothermal planes 的分区是在**固定深度**之间切的，两条路径
必须描述同样的厚度：

```
木头路径    90 mm 木材        + 85 mm 保温（盖在上面）
保温路径    90 mm 保温（弦间）+ 85 mm 保温（盖在上面）
```

那 85 mm 按 H1/AS1 **2.1.3.2 (i)** 并入桥接段，作用在**每一条路径**上——所以它出现在
顶部的 `SHARED ACROSS ALL PATHS` 区，不是留在保温那一栏里。

### 三种情况，三种显示

**① 保温比框架深**（默认，175 > 90）：

- ⑤ 卡片里显示三行：
  ```
  175 mm at this R-value
  90 mm between the members
  85 mm over them → shared
  ```
  最后一行是 `--brand` 色，可点击，点了滚动到顶部的 shared 区并高亮那一行
- shared 区多出一项：`Ceiling insulation over the framing · 85 mm`

**② 保温正好填满**（比如 90 mm 装进 90 mm）：

- ⑤ 卡片只显示 `90 mm — fills the framing depth`
- shared 区只有 roof space 一项

**③ 保温比框架浅**（比如 140 mm 装进 190 mm 的椽）：

- ⑤ 卡片下方出现 `--review` 提示：
  ```
  50 mm of cavity is left beside the members. That air space has its own
  resistance — it is not the same as solid insulation, and it is not nothing.
  ```
- **不要自动补一个空腔 R 值**，那要查 NZS 4214 Table E3，取决于空腔宽度和表面发射率，
  我们还没有那张表

### 这个拆分不是细节

把整块 175 mm 的 R3.6 全算在保温那条路径上、木头路径什么都不加，等于假装木头上面没
盖东西。在示意数值下这会让屋顶从 **R3.7584 算成 R3.3422**——偏低 0.42。

方向是保守的（算低了不会让不合规的过关），但结论仍然是错的：它会让设计师去加一层这个
屋顶其实不需要的保温。

---

## 三、本轮要出的 artboard（共 3 块，桌面 1440px）

1. **Roof — two columns, blanket over framing**（默认：175 mm / 90 mm，shared 区两项）
2. **Roof — blanket shallower than framing**（140 mm 装进 190 mm 椽，`--review` 提示）
3. artboard 1 的浅色版

---

## 四、不要做的事

1. 不要把 ④ 和 ⑤ 再上下堆叠——它们在同一个深度上，是两条路径不是两层
2. 不要给 `Batten cavity` 编号
3. 不要把"盖在框架上面那部分保温"留在保温那一栏——它作用在每条路径上，必须在 shared 区
4. 不要为残留空腔编一个 R 值
5. 两栏占比加起来必须是 100.0%，不要出现对不上的数字
