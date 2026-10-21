> **这是什么**：给 Claude Design 的**第十轮**改稿 prompt，针对 `r-value-configurator-v5`
> 第九轮之后的版本。
>
> **用法**：整段粘进 Design 的现有对话。
>
> **这一轮三件事**：
> 1. 桁架上下弦默认同尺寸 → 合成一个 `Timber truss size`，锁住；点 `Custom` 才拆成上弦/下弦
> 2. 木材占比的算式和结果移到 `THROUGH THE TIMBER` 那张卡里
> 3. 右栏剖面图下面挂一张**跟着剖面图一起浮动**的保温产品表，目前**只收 Pink® Batts®**
>
> **产品数据来源**：BRANZ Appraisal No. 238 (2023) *Pink® Batts® Insulation* Table 1，
> 作者提供。只取了屋顶天花和檐口两类；Skillion 和 140 mm 墙体那两张表作者粘贴的文字
> 已经错位，**没有转录**，要用时从原件重新取。
>
> **顺带纠正第九轮的一个实现**：Design 把"下层填满弦深"做成了"比弦深厚的最小标准厚度
> (70/90/110/140/175/220/290)"。这套厚度是它自拟的，140 mm 弦会得到 175 而不是 BRANZ
> 要求的 160。现在有了真实产品表，下层直接从表里取。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第十轮

前九轮定下的 token、层编号、木架层标题、④ ⑤ 括线与共用网格、两栏路径、表盘单阈值、
屋面联动、右栏常驻剖面图与悬停联动、`—` 占位都保留。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、桁架尺寸：一个值，锁住，需要时再拆

现在 ④ 标题区是 `BOTTOM CHORD [45] × [90] mm`。但桁架的上弦和下弦通常是同一种料，
分开填是多余的；而且只写 bottom chord，用户会以为上弦没被考虑。

### 默认（锁定）状态

选 `Truss` 时，标题区显示：

```
STRUCTURE          TIMBER TRUSS SIZE                  SPACING       ROOF SPACE
[ Truss ][ Rafter ]  45 × 90 mm  🔒  [ Custom ]        [900] mm      ☑ Ventilated
                     Top and bottom chord
```

- 字段名 `TIMBER TRUSS SIZE`，值 `45 × 90 mm`，下面一行小字 `Top and bottom chord`
- 锁定时这个值是**只读的显示**，不是输入框；右边一枚锁图标
- 旁边一个次级按钮 `Custom`

### 点 `Custom` 之后

同一位置展开成两行，预填当前值，都可以手改：

```
TIMBER TRUSS SIZE                              [ Lock ]
  Top chord     [45] × [90] mm
  Bottom chord  [45] × [90] mm
```

- 按钮变成 `Lock`，点回去时若两行不同，弹一句确认：
  `Top and bottom chord differ. Locking will set both to the bottom chord size.`
- 两行后面各带一句用途说明（`--ink-3` 小字），让人知道为什么要分开填：
  - Top chord → `Sets the depth at the eaves`
  - Bottom chord → `Sets the ceiling framing fraction and the lower insulation layer`

这两句是实话：上弦深度进入檐口几何（⑥ perimeter 的 `Depth at the wall line`），
下弦的宽度和深度进入天花框架率和下层保温。

### 选 `Rafter` 时

没有上下弦之分，标题区只显示 `RAFTER SIZE [45] × [190] mm`，**不出现锁和 Custom**。

---

## 二、木材占比放进 THROUGH THE TIMBER

现在 `45 ÷ 900 = 5.0%` 挂在标题区 Spacing 下面，和它描述的那条路径离得很远。

把算式和结果**移进左栏那张卡**：

```
THROUGH THE TIMBER
┌──────────────────────────────────────┐
│ Bottom chord                   R—    │
│ 90 mm timber                         │
│                                      │
│ 45 mm ÷ 900 mm centres               │
│ = 5.0% timber                        │  ← 结果大号，--brand 色
└──────────────────────────────────────┘
```

- 右上角原来的 `5.0%` 去掉，结果只出现在这一处
- 右栏保温卡相应显示 `100% − 5.0% = 95.0%`，同样的排法
- 标题区 Spacing 下面不再显示算式
- **⑤ Ceiling battens 照同样处理**：`45 mm ÷ 600 mm centres = 7.5% timber` 进
  `THROUGH THE BATTEN` 卡，右边 `Batten cavity` 显示 `100% − 7.5% = 92.5%`

---

## 三、右栏：剖面图 + 保温产品表，一起浮动

### 结构

剖面图和产品表放在**同一个 sticky 容器**里，一起跟着滚动：

```
┌─ sticky, top: 88px ───────────────────────┐
│ Section · eaves                            │
│ （剖面图，高约 360px）                      │
│ Hover a layer to find it in the section    │
├────────────────────────────────────────────┤
│ Insulation · Pink® Batts®                  │
│ （产品表，占满剩下的视口高度，内部滚动）    │
└────────────────────────────────────────────┘
```

- 产品表 `max-height: calc(100vh - 88px - 剖面图高度 - 间距)`，超出部分**在表内滚动**，
  整个容器不能超出视口
- v5 现在把产品表挪到了左栏下面——**挪回右栏**，放在剖面图下方

### 产品表内容（屋顶页）

只列两组，**不要出现其他品牌**：

**Ceiling thermal insulation**

| R-value | Thickness (mm) | Width (mm) |
|---|---|---|
| R1.8 | 95 | 432 |
| R2.2 | 115 | 432 |
| R2.6 | 110 | 432 |
| R2.6 | 140 | 432 |
| R3.0 | 160 | 432 |
| R3.2 | 170 | 432 |
| R3.6 | 180 | 432 |
| R4.0 | 195 | 432 |
| R4.5 | 210 | 460 |
| R5.0 | 225 | 460 |
| R6.0 | 245 | 460 |
| R7.0 | 275 | 460 |

**Roof perimeter**

| R-value | Thickness (mm) | Width (mm) |
|---|---|---|
| R2.7 | 100 | 560 |

- 每行：`R2.6 · 110 mm` 左对齐，宽度 `432 wide` 用 `--ink-3` 小字；右侧留给状态 chip
- **两个 R2.6 必须都列出来**，厚度不同（110 / 140），这正是下层选料的关键
- 表底一行来源，`--ink-3`：`Pink® Batts® product data from BRANZ Appraisal No. 238 (2023).
  R-values are the manufacturer's declared product values.`
- 只用文字品牌名，**不要放 Pink Batts 的 logo，也不要用它的粉色**——列表用我们自己的 token

### 状态 chip

- 当前被选作下层的那一行：chip `Between the members`
- 当前被选作上层的那一行：chip `Over the members`
- 厚度正好等于"下弦深度 + 20 mm"的那一行：chip `Fills a 90 mm chord`（数字随下弦深度变）

### 点击产品

- 点某行 = 把这个产品填进**当前激活的保温层**（最后获得焦点的那组输入；默认是
  `Over the members`），R 值和厚度**一起**填，并闪一下
- 点 `Roof perimeter` 组那一行 = 填进 ⑥ perimeter 面板
- 悬停产品行 → 剖面图里 `insulation` 组高亮（沿用第八轮的联动）

---

## 四、下层保温从产品表取，不用自拟厚度

第七轮的 BRANZ 规则是**下层正好填满弦深，比弦深厚 20 mm**：90 mm 弦用 110 mm，
140 mm 弦用 160 mm。现在直接落到产品上：

| 下弦深度 | 下层产品 |
|---|---|
| 90 mm | **R2.6 · 110 mm** |
| 140 mm | **R3.0 · 160 mm** |

- `BETWEEN THE MEMBERS` 默认带出这个产品，**R 值和厚度都来自产品**，不是 R3.6 配 110 mm
  这种拼出来的组合（v5 截图现在就是 3.6 / 110，R3.6 的 Pink Batts 是 180 mm 厚）
- 用户仍可以从产品表另选，或手填 → 显示 `Custom`，若厚度不等于弦深 + 20 mm，给第七轮那条
  `--review`
- 若弦深 + 20 mm 在表里**没有对应产品**（比如 70 mm 弦要 90 mm）：不要自动挑一个相近的，
  字段留空并提示 `No Pink® Batts® ceiling product is 90 mm thick — pick one from the list.`
- 把 Design 自拟的 `70/90/110/140/175/220/290` 这套厚度**删掉**

`OVER THE MEMBERS` 同理改成从产品表选（下拉 + `Custom`），默认 `R3.6 · 180 mm`。
下方文字和 shared 区照第九轮的规则引用它：`180 mm over them`。

---

## 五、本轮要出的 artboard（共 5 块，桌面 1440px）

1. **Roof — truss size locked**（`45 × 90 mm 🔒 Custom`，timber 卡里 `= 5.0% timber`，
   下层 R2.6 · 110 mm，上层 R3.6 · 180 mm，右栏剖面图 + 产品表，两行 chip 可见）
2. **Roof — truss size custom**（上下弦两行，各带用途说明）
3. **Roof — scrolled to ⑤**（左栏滚到 battens，右栏剖面图和产品表整体仍在原位，表内可滚）
4. **Roof — 140 mm chord**（下层自动变 R3.0 · 160 mm，`Fills a 140 mm chord` chip 移到那一行）
5. artboard 1 的浅色版

---

## 六、不要做的事

1. 锁定状态下不要显示两组上下弦输入框
2. 不要在标题区和 timber 卡里各显示一次 5.0%，只在卡里
3. 产品表不要出现 Pink Batts 以外的品牌，不要用它的 logo 和品牌粉色
4. 不要自拟保温厚度序列，下层产品只从表里取
5. 不要把 R 值和厚度分开取自不同产品
6. 产品表不要放回左栏
