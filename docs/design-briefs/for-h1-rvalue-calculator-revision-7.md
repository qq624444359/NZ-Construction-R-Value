> **这是什么**：给 Claude Design 的**第七轮**改稿 prompt。这一轮不是修补，是按真实施工
> 做法**重新规划天花保温和檐口两块**。
>
> **来源**：作者提供的一份 2023 年供应商技术材料（Comfortech / Pink Batts，讲第 5 版 H1）。
> 它的 **R6.6 目标是 Schedule method 的，已随第 5 版作废**；但它讲的构造做法和可建造性
> 是按 NZS 4214 的构造 R 值来的，第 6 版照样成立。**只取做法，不取目标值。**
>
> **一条版权约束**：那份材料里的檐口压缩计算器标着
> *"developed by Design Navigator Limited … must not be copied, reproduced, distributed …
> without prior written permission"*。**它的算法不能复制。** 第二节区分了哪些是公共的
> 物理量、哪些必须另找来源。
>
> **这一轮三件事**：
> 1. 天花保温从"一块棉"改成**三种做法模式**，下层厚度由弦深决定
> 2. 檐口从一个 `Heel height` 输入框改成**独立面板**，因为那里是一道压缩梯度
> 3. 墙体页以**框架率**为主线

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第七轮

前六轮定下的 token、层编号、左右两栏、四路径网格、表盘单阈值、手填数值、屋面联动都保留。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、天花保温：三种做法，不是一个 R 值输入框

现在 ⑤ Ceiling insulation 是一个 R 值数字框 + 一句 `175 mm at this R-value`。真实做法
不是这样选的，而且**照现在这样填会算出达不到的值**。

行业技术材料里的三条事实：

- **产品 R 值 ≠ 构造 R 值。** R7.0 的产品铺进桁架间达不到对应的构造 R 值
- 单层厚棉塞进弦间会 **ballooning**，形成 **chimney effect**（空气沿蓬起的缝隙对流短路）
- BRANZ 对双层做法的要求：**下层必须正好填满弦深** —— 90 mm 下弦用 **110 mm** 厚，
  140 mm 下弦用 **160 mm** 厚。所以「下层用 180 mm」是不可接受的

### ⑤ 卡片改成先选做法模式

```
⑤  Ceiling insulation                                    95.0%

    [ Two layer ] [ Single layer, notched ] [ Single layer, fills depth ]
```

**Two layer（默认）** —— 展开两层，下层厚度**由 ④ 的 chord depth 决定，只读**：

```
    Lower layer · fills the framing depth
      ┌─────┐  R-value      110 mm — set by the 90 mm chord depth
      │ 2.6 │
      └─────┘
    Upper layer · over the framing → shared by every path
      ┌─────┐  R-value      ┌─────┐ mm
      │ 4.5 │               │ 195 │
      └─────┘               └─────┘
```

- 下层厚度跟着 chord depth 走：90 mm 弦 → 110 mm，140 mm 弦 → 160 mm。改 ④ 的 depth，
  这里跟着变，并闪一下
- 下层的 R 值由用户填（要用**压缩状态下的厂商声明值**，不是自由状态的）
- 上层自动进入顶部 `SHARED ACROSS ALL PATHS` 区 —— 它盖过木头，作用在每条路径上
- 若用户把下层厚度改成不匹配弦深的值（做成可编辑但带校验）：`--review` 提示
  `BRANZ guidance is a lower layer that exactly fills the framing depth — 110 mm for a 90 mm chord.`

**Single layer, notched** —— 单层跨过下弦，现场开槽让出弦的位置：

```
    ┌─────┐  R-value      ┌─────┐ mm width
    │ 7.0 │               │ 460 │
    └─────┘               └─────┘
    Notched on site to clear the chord
```

这种做法下**保温是连续的、没有被木头打断**，所以四路径网格要相应变化：
框架那一栏的路径里，保温仍然经过。在网格上方加一行说明：
`Notched insulation runs over the chord, so the framing path carries insulation too.`

**Single layer, fills depth** —— 单层正好填满弦间，不盖过顶：没有 shared 层，
第六轮那个"比框架浅就提示残留空腔"的规则在这里生效。

### 一条要显示的警告

任一模式下，若保温标称厚度**大于弦深且没有上层**（也就是硬塞）：

```
A blanket thicker than the framing will balloon between the members rather
than fill them. The air path that opens up is what stops the product R-value
becoming the construction R-value.
```

用 `--review`，不要用 `--fail` —— 这是做法问题，不是合规判定。

---

## 二、檐口：独立面板，那里是一道压缩梯度

现在檐口只有 ④ 里的一个 `Heel height` 数字框。真实情况复杂得多，而且**这是屋顶 R 值
真正失效的地方**。

行业材料里的事实：

- 桁架厂最想避免的就是为保温而抬高 heel —— 最常见的是 **20–25° 坡 + 标准 heel**
- 檐口必须留 **25 mm 通风间隙**
- 檐口保温带典型宽度 **460–500 mm**
- 檩条落在距屋檐 **600 mm 以内**时，需要 **insulation guard**
- 檐口的保温是**被压扁的**，而且是沿宽度渐变的楔形 —— 不是"装得下/装不下"

一组实测参考：20° 坡、90 mm 椽、500 mm 檐口宽、R7.0 @275 mm 的产品，
**檐口平均 R 约 4.21**，而不是 7.0。

### 要出的面板：⑦ Roof perimeter（新增，在桥接段之后、ceiling lining 之前）

```
⑦  Roof perimeter                                    500 mm strip

    Roof pitch  ┌────┐ °      Heel  ┌─────┐ mm     Strip width ┌─────┐ mm
                │ 20 │              │  0  │                    │ 500 │
                └────┘              └─────┘                    └─────┘

    ☑ 25 mm ventilation gap maintained
    ☐ Insulation guard   (purlin within 600 mm of the roof edge)

    ─────────────────────────────────────────────────────────────
    Available depth across the strip      95.8 mm at the wall → 275 mm
    Perimeter average R                   —
    ─────────────────────────────────────────────────────────────
    H1/AS1 lets the roof drop to R3.30 for up to 500 mm in from the
    ceiling perimeter (Table 2.1.2.12, note 4), and never below R2.60
    anywhere (2.1.2.11 a).
```

- `Available depth` 由**几何**算出来：坡度、椽深、heel、通风间隙。这是三角函数，画出来
- `Perimeter average R` 现在显示 `—`，见下面的版权说明
- 勾掉通风间隙 → `--fail`，文案 `A ventilation path is required; removing it is not a
  way to gain depth.`
- 檐口平均 R 低于 R3.30 → `--review`；低于 R2.60 → `--fail`

### 版权：哪些能算，哪些不能

作者提供的那份材料里，檐口压缩计算器标明由 **Design Navigator Limited** 开发，
**其算法不得复制**。所以：

| | 能不能做 |
|---|---|
| **几何**：按坡度、椽深、heel、通风间隙算出檐口各处的可用净空 | ✅ 三角函数，不是任何人的专有内容 |
| **压缩会降低 R 值**这个事实，以及把压缩后的平均 R 用于檐口段 | ✅ 公共的物理与合规事实 |
| **压缩率 → R 值折减**的具体系数与算法 | ❌ 不要复制那份计算器。要么向保温厂商取压缩状态下的声明值，要么让用户自己填 |

所以面板上 `Perimeter average R` 旁边放一个输入框，标 `Compressed R-value (manufacturer
declared)`，并在下面写：

```
Compression reduces R, and by how much is the insulation manufacturer's figure
for that product at that thickness — not something this tool infers.
```

**不要自己拟一个折减公式。**

---

## 三、墙体页：以框架率为主线

第四轮已经要求 framing fraction 并排显示 38% 和实算值。这一轮把它提到**墙体页最上面**，
因为它现在是墙体设计的主要矛盾。

行业材料在第 5 版时期就写明：实际墙体框架率平均约 **34%**，而当时的计算假设远低于此；
**23–24% 的框架率下 90 mm 墙配 R2.8 才刚好达到 R2.0 的构造值**。第 6 版随后把默认框架率
定成 **不低于 38%**。

在墙体页 framing fraction 面板下方加一句结论性提示（`--review`）：

```
At 38% framing a 90 mm wall reaches noticeably less than it does at 24%. The
usual answers are 140 mm framing, or a second insulation layer inside or
outside the frame.
```

并在墙体的做法选择里明确给出这三条路：`90 mm frame` · `140 mm frame` ·
`90 mm frame + continuous insulation layer`。第三种在层表里**多一层不被框架打断的连续
保温**，所以它会落在桥接段之外 —— 这正好让用户看见"为什么加这一层这么有效"。

---

## 四、本轮要出的 artboard（共 6 块，桌面 1440px）

1. **Roof — two layer**（默认模式，下层 110 mm 由弦深带出，上层进 shared 区）
2. **Roof — single layer notched**（网格上方多那行说明）
3. **Roof — ballooning warning**（厚棉硬塞，`--review`）
4. **Roof perimeter panel**（⑦，几何算出可用净空，压缩 R 待填）
5. **Wall — framing fraction leading**（38% vs 实算，三条出路）
6. artboard 1 的浅色版

---

## 五、不要做的事

1. **不要复制那份檐口压缩计算器的算法。** 几何可以算，折减系数要向厂商取
2. 不要让下层厚度自由填而不校验弦深 —— BRANZ 的要求是"正好填满"
3. 不要把 ballooning 做成 `--fail`，那是做法问题不是合规判定
4. 不要把通风间隙做成可以为了凑净空而关掉的普通开关
5. 不要引用那份材料里的 R6.6 目标 —— 那是第 5 版 Schedule method，已作废
