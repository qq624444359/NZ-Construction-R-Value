> **这是什么**：给 Claude Design 的 **Slab on ground 页面** prompt。
>
> **用法**：从「# 粘贴给 Claude Design 的说明」那一行开始往下，整段粘进 Design 现有的对话。
>
> **和屋顶页最大的不同**：slab 不是一层一层叠起来的构造。H1/AS1 Appendix E 按
> **地板的形状**（面积 ÷ 周长）和**墙厚**查表得出 R 值——同样的混凝土，方正的房子比
> 细长的房子 R 值高。所以这一页**没有层列表**，是"形状输入 + 查表结果 + 保温阶梯"。
>
> **作者定下的原则**：地基保温**永远不是首选项**。页面默认是不保温的 slab；保温选项
> 收起来放在最下面，明确标成 last resort。

---

# 粘贴给 Claude Design 的说明 —— Slab on ground 页面

沿用 Roof / Wall 页定下的 token、左右两栏、表盘单阈值、`—` 占位、深浅两套主题。
全站文案英文，下面给出的 copy 逐字使用。

现在 Slab on ground 页是 "Not in this revision" 的静态占位，**整个替换**成下面的设计。
Suspended floor 仍保持占位，下一轮再做。

---

## 一、数据从哪来

页面调用后端 `POST /api/h1/slab`：

```json
// 请求
{
  "area_m2": 150,
  "perimeter_m": 50,
  "wall_thickness_mm": 90,
  "masonry_veneer": false,
  "foundation": "slab",        // "slab" 或 "raft"
  "external": false,           // true = 用外轮廓尺寸（Equation E.2）
  "w_m": 0                     // 只有 external 为 true 时用
}

// 返回
{
  "area_to_perimeter": 3.0,
  "ladder": [                  // 这个形状下所有保温做法，不保温的排第一
    { "foundation": "slab", "edge_insulation": false, "underslab": "none",      "r_value": 1.2, "insulated": false },
    { "foundation": "slab", "edge_insulation": false, "underslab": "strip_1.2", "r_value": 1.4, "insulated": true },
    ...
    { "foundation": "slab", "edge_insulation": true,  "underslab": "full_2.4",  "r_value": 2.5, "insulated": true }
  ],
  "underslab_products": [
    { "brand": "EXPOL", "product": "SlabX200", "thickness_mm": 40,  "r_value": 1.22, "credited": 1.2, "thinnest_for_credit": true },
    { "brand": "EXPOL", "product": "SlabX200", "thickness_mm": 50,  "r_value": 1.5,  "credited": 1.2, "thinnest_for_credit": false },
    ...
  ],
  "provisional": true
}
```

输入超出表格范围时返回 400 和一句 `detail`（比如墙薄于 90 mm、面积周长比小于 0.6），
**原样显示**在对应字段下面，用 `--fail` 样式。

出稿时用下面这组示例数据（150 m² / 50 m / 90 mm / 非砖墙），返回的 ladder 是：

| 做法 | R |
|---|---|
| Uninsulated | R1.2 |
| 1.2 m strip, R1.2 underslab | R1.4 |
| 1.2 m strip, R2.4 underslab | R1.4 |
| R1.0 vertical edge | R1.5 |
| Full cover, R1.2 underslab | R1.7 |
| R1.0 edge + 1.2 m strip, R1.2 | R1.7 |
| R1.0 edge + 1.2 m strip, R2.4 | R1.7 |
| Full cover, R2.4 underslab | R2.0 |
| R1.0 edge + full cover, R1.2 | R2.1 |
| R1.0 edge + full cover, R2.4 | R2.5 |

---

## 二、左栏：从上到下三块

### ① Floor shape

```
① Floor shape                                          From Revit ·
                                                        ─────────
   Slab area    ┌───────┐ m²      Perimeter ┌───────┐ m
                │  150  │                   │  50   │
                └───────┘                   └───────┘
   Measured to the inside face of the external walls

   Area-to-perimeter ratio   3.00  → read from the 3.0 row
```

- 右上角一枚来源 chip：数据从 Revit 插件来时显示 `From Revit`，用户手改后变成 `Edited`
- **不要做"内轮廓 / 外轮廓"切换。** Equation E.1（内轮廓）和 E.2（外轮廓减 w/2）是量同一个
  量的两种办法，结果几乎一样（15 × 10 m 的房子：3.000 对 3.004）。页面统一用内轮廓，
  面积和周长下面一行小字 `Measured to the inside face of the external walls`。
  接口的 `external` / `w_m` 参数留给 Revit 插件，页面不用
- 比值那一行是**算出来的**，右侧那句 `→ read from the 3.0 row` 很重要：表格**只取比它小的
  最近一行，不插值**。比值 3.37 就写 `→ read from the 3.2 row`。悬停显示：
  `H1/AS1 Appendix E: between rows, use the nearest smaller ratio in the table.`
- 字段下方说明（`--ink-3`）：
  `Only the part of the slab inside the thermal envelope. Leave out garages, porches and patios.`

### ② Edge of the slab

```
② Edge of the slab

   Foundation   [ Slab ][ Raft ]
                Raft includes foam-pod floors

   External walls   [ Other cladding ][ Masonry veneer ][ Mixed ]

   Effective wall thickness   ┌─────┐ mm      band  90 – 139 mm
                              │  90 │
                              └─────┘
```

- `Mixed` 选中时出现一个滑块：`Masonry veneer share of the perimeter  ┌──┐ %`，
  结果按 Equation E.4 合成（前端用两个请求的结果算：`1 / (f/Rmv + (1−f)/Rother)`）
- 墙厚右侧显示它落在哪一档：`90 – 139 mm` / `140 – 179 mm` / `180 – 249 mm` /
  `250 – 299 mm` / `300 mm and over`
- 墙厚下方说明：`Slab edge at floor level to the inside face of the wall.`

### ③ Foundation insulation —— 默认收起

这一块**默认收起**，放在左栏最下面，和上面两块之间空一段距离：

```
┌─────────────────────────────────────────────────────────────────┐
│ ③ Foundation insulation                    LAST RESORT   ▸     │
│   Not needed — the uninsulated slab already gives R1.2          │
│   and this floor needs R1.22 or better.                         │
└─────────────────────────────────────────────────────────────────┘
```

- 标题右侧一枚 chip `LAST RESORT`（`--review` 色系，描边不填充）
- 收起时第二行是一句**结论**，三种情况：
  - 不保温已经够：`Not needed — the uninsulated slab already gives R1.2 and this floor needs R1.22 or better.`
    （"needs" 的数字来自 headroom 接口，和总览页 `R1.30 → R1.22` 是同一个数）
  - 不保温不够、但加强别的构件就能够：`Improve the roof, walls or glazing first — the optimiser only reaches for this when nothing else will do.`
  - 只有保温才能达标：`The rest of the building cannot make up for it — this floor needs insulation.`
    这种情况下整块**自动展开**，chip 改成 `--fail` 色
- 点击展开后的内容：

```
   Vertical edge insulation   [ None ][ R1.0 ]
                              Share of the perimeter insulated ┌────┐ %   (默认 100)

   Underslab insulation       [ None ][ 1.2 m strip ][ Full cover ]

   Product
   ┌────────────────────────────────────────────────────────────┐
   │ EXPOL SlabX200                                              │
   │   40 mm   R1.22   counts as R1.2                  ●        │
   │   50 mm   R1.50   counts as R1.2   No extra credit          │
   │   60 mm   R1.81   counts as R1.2   No extra credit          │
   │   75 mm   R2.20   counts as R1.2   No extra credit          │
   │  100 mm   R3.00   counts as R2.4                            │
   │  150 mm   R4.50   counts as R2.4   No extra credit          │
   │  200 mm   R6.00   counts as R2.4   No extra credit          │
   └────────────────────────────────────────────────────────────┘
   The tables only recognise R1.2 and R2.4 under the slab. A thicker
   board earns nothing more unless the floor is calculated under H1/VM1.
```

- 产品列表直接来自 `underslab_products`。`thinnest_for_credit: false` 的行：文字降到 60%，
  右侧 chip `No extra credit`，**可以选，不禁用**
- 选中一个厚度 → 决定用 R1.2 还是 R2.4 那一套表（`credited`），ladder 里对应那一行高亮
- `Raft` 时没有 underslab（表格里没有），这一行隐藏，只剩 edge 选项
- 边缘保温不满周长时，按 Equation E.3 合成，和 `Mixed` 墙同一种算法

---

## 三、右栏：结果 + 阶梯

右栏从上到下：**表盘 → 保温阶梯 → 来源说明**，和屋顶页一样 sticky。

### 表盘

沿用屋顶页的表盘：当前 R 值大字、`needed here` 阈值线、`no upper limit`。
`Heated floor` 勾选框保留：勾上时阈值换成 Table 2.1.2.12（zone 1–3 R2.5 / zone 4 R2.8 /
zone 5–6 R3.0），并且说明 `Paragraph 2.1.2.12 applies`。

### 保温阶梯（这一页的主视觉）

把 `ladder` 画成一列**横向条**，每一种做法一行，条长 = R 值，从上到下 R 值递增：

```
 SLAB OPTIONS FOR THIS FLOOR                              needed R1.22 ┆
 ─────────────────────────────────────────────────────────────────────┆──
 Uninsulated                       ████████████ R1.2   ◀ current       ┆
 1.2 m strip · R1.2                ██████████████ R1.4     LAST RESORT ┆
 1.2 m strip · R2.4                ██████████████ R1.4     LAST RESORT ┆
 R1.0 edge                         ███████████████ R1.5    LAST RESORT ┆
 Full cover · R1.2                 █████████████████ R1.7  LAST RESORT ┆
 ...                                                                   ┆
 R1.0 edge + full cover · R2.4     █████████████████████████ R2.5      ┆
```

- 一条竖直虚线标 `needed R1.22`，横穿所有行——一眼看出哪些做法够、哪些不够
- 不保温那一行用 `--brand` 实色；保温的行用**同色 35% 不透明**，右侧 `LAST RESORT` 小字
- 当前选中的做法行左侧一个 `◀ current`，并加粗
- **R 值相同的做法并排提示**：`1.2 m strip · R1.2` 和 `· R2.4` 都是 R1.4 时，后一行右侧加
  `Same as R1.2 here`——这正是"加厚不值"的时刻
- 悬停某一行 → 左栏 ③ 的选项临时切到这种做法预览（灰色斜体），移开恢复；点击 = 选定，
  并自动展开 ③
- 点击 `Uninsulated` 那一行 = 撤掉所有地基保温

### 来源说明（小字，`--ink-3`）

```
Construction R-values from H1/AS1 6th edition Appendix E, Tables E.1.2.1A–X.
Transcribed and cross-checked; not yet verified against the printed tables.
```

`provisional: true` 时第二句显示；为 false 时去掉。

---

## 四、错误和边界

- 面积周长比 < 0.6：比值那一行变 `--fail`，显示后端的 detail，阶梯区显示
  `This floor is outside the tables — calculate it under H1/VM1 Appendix E.`
- 墙厚 < 90 mm：同样处理，挂在墙厚字段下
- 面积或周长为空：阶梯显示 `—` 占位行，不要画假数据

---

## 五、本轮要出的 artboard（共 5 块，桌面 1440px）

**这五块是出稿用的状态截图，不是页面上的控件。** 页面上不要出现一排
`Uninsulated is enough / Insulation opened / Only insulation will do / Outside the tables`
的切换按钮——这些状态由数据自动决定，只体现在 ③ Foundation insulation 那一块里
（收起时的结论句、`LAST RESORT` chip 的颜色、是否自动展开）。

1. **Slab — uninsulated is enough**（③ 收起，结论 "Not needed"，阶梯里当前在第一行）
2. **Slab — insulation opened**（③ 展开，选了 SlabX200 40 mm + full cover，阶梯里当前在 R1.7）
3. **Slab — only insulation will do**（③ 自动展开、chip 变 `--fail`）
4. **Slab — outside the tables**（比值 0.5，VM1 提示）
5. artboard 1 的浅色版

---

## 六、不要做的事

1. **不要把地基保温放在显眼位置或默认展开**（只有"只能靠保温"那一种情况才自动展开）
2. 不要给这一页做层列表或剖面图——slab 的 R 值不是按层算的
3. 不要插值面积周长比，永远取较小的一行，并把"取了哪一行"写出来
4. 不要禁用 "No extra credit" 的厚度，只提示
5. 不要显示表格以外的保温做法（比如 R3.0 underslab），表里只有 R1.2 和 R2.4
6. 阶梯里的数字只来自接口，不要手写
