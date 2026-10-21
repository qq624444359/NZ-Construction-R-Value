> **这是什么**：给 Claude Design 的 prompt —— **重排页面结构**：面积在哪输入、顶部卡片
> 只做汇总、加导出（PDF + BRANZ）。
>
> **用法**：从「# 粘贴给 Claude Design 的说明」那一行开始往下，整段粘进 Design 现有的对话。
>
> **为什么要改结构**：现在顶部四张卡片每张只有一个面积、一个 R 值。但真实项目一个类型
> 有好几种做法——作者给的实例（一个已提交的 6th edition 计算）里：屋顶 2 种（平天花 60.2 m²、
> 斜顶 10.3 m²）、墙 5 种、窗 12 樘、门 2 樘。一张卡一个数装不下。BRANZ 的表本身就是
> "每一行一个构件"。

---

# 粘贴给 Claude Design 的说明 —— 构件清单 + 汇总 + 导出

沿用现有 token、深浅主题、`—` 占位。全站文案英文，下面给出的 copy 逐字使用。

## 页面新的三层结构

```
① Building summary        —— 只读，看结果
② Envelope schedule       —— 在这里输入面积（新的）
③ Constructions           —— 现在的 Roof / Wall / Slab… build-up 页，定义每种做法的 R 值
④ Export                  —— PDF 报告 + BRANZ 录入
```

数据关系：**一种做法（construction）可以被清单里的很多行用**。比如 "Fibre cement 90mm"
这种墙做法定义一次，清单里北立面、南立面两行都选它。改了做法，所有用它的行一起变。

---

## 一、① Building summary —— 只读

顶部四张卡片（Roof / Wall / Suspended floor / Slab on ground）**去掉所有输入框**。
它们是汇总，不让改。每张卡显示：

```
Roof / ceiling
70.5 m²  ·  2 constructions
10.7 W/K
can go to R3.07                 ← headroom，原来那个数
Minimum R2.60
```

- 面积 = 清单里这个类型所有行的面积之和；W/K = 这些行热损失之和
- Wall 卡里的 Glazing 分隔区保留，同样只读：`46.1 m² · 24.3% of gross wall · 100.2 W/K`
- **点卡片 = 滚动到清单里这个类型的那一组**，不是进入编辑
- 卡片上方那一行状态（`As specified, the building complies`）保留，旁边加总数：
  `256.7 W/K proposed · 257.1 W/K reference · margin 0.4`
- 删掉 "Enter each element's area and specified R in its card" 这句

---

## 二、② Envelope schedule —— 输入面积的地方（新）

放在汇总下面，一个按类型分组的表，和 BRANZ 表一一对应：

```
ENVELOPE SCHEDULE                                    From Revit · 24 rows   [ + Add row ]

Roof                                                           70.5 m²   10.7 W/K
  Description            Construction ▾              Area m²   R        Heated   W/K
  Flat ceiling roofing   Truss, R7.0 + R2.6     🔗   60.2      R7.18    ☐        8.4
  Rafter roofing         Skillion, R4.0         🔗   10.3      R4.44    ☐        2.3
  + Add roof

Walls                                                         139.8 m²   61.7 W/K
  Fibre cement 90mm      90 stud, R2.8          🔗   63.9      R2.20    ☐       29.0
  ...

Glazing (walls & doors)                       24.3% of gross wall   46.1 m²  100.2 W/K
  ID      Height  Width   Area m²   R       W/K
  EXW103  2100    4100    8.6       R0.46   18.7
  ...
```

每一行：

- `Description`：自由文字，进 PDF 和 BRANZ 表的 Description 列
- `Construction`：下拉，列出 ③ 里这个类型已定义的做法，最后一项 `Enter R manually`。
  选了做法 → R 值**只读**，旁边一个 🔗 表示来自做法，点它跳到那个做法；
  选 `Enter R manually` → R 变成输入框
- `Area`：输入框。来自 Revit 时右侧小 chip `Revit`，手改后变 `Edited`
- 窗和门这两组列不同：`ID / Height mm / Width mm / Area / R`。填了高宽就自动算面积
  （面积变只读），只填面积也行
- `Heated`：只有 Slab / Other floors / Roof / Walls 有这一列（和 BRANZ 一致）
- `W/K` = 面积 ÷ R，实时算
- 低于 2.1.2.11 最小值的行，R 那一格 `--fail`，悬停显示 `Below the R2.60 minimum of 2.1.2.11`
- 每组标题右侧是这一组的合计；每组底部 `+ Add <type>`；行可以拖动排序、可删除

**空项目**：清单显示一行说明
`Areas come from the Revit plugin, or add rows by hand.`，不要放示例数字。

---

## 三、③ Constructions —— build-up 页改成"做法库"

现在 Roof / Wall / Slab 的 build-up 页**内容不变**，只改外面一层：

- 每个类型可以有**多个做法**。build-up 页顶部加一排做法标签：
  `[ Truss, R7.0 + R2.6 ] [ Skillion, R4.0 ] [ + New construction ]`
- 每个做法有名字（可改），默认按内容自动起名
- 做法标签上显示 `Used by 1 row` / `Not used`
- Slab 的做法就是 slab 页那一套（形状 + 边缘 + 地基保温），一个项目通常只有一个

---

## 四、④ Export

页面最底部（以及顶部状态栏右侧一个 `Export` 按钮滚到这里）：

```
EXPORT

  ┌───────────────────────────────────────────────────────────────┐
  │ 📄 Consent report (PDF)                                         │
  │    Results, the BRANZ entry sheet, and how each construction    │
  │    R-value was worked out — one page each.                      │
  │                                             [ Download PDF ]    │
  └───────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ BRANZ calculation workbook                                       │
  │    Download the workbook from BRANZ, then paste one sheet at a   │
  │    time. Click the cell shown, then press Ctrl+V.                │
  │                                                                 │
  │    Project Details      F6 – F12                    [ Copy ]    │
  │    Roof                 click C10   2 rows          [ Copy ]    │
  │    Walls                click C10   5 rows          [ Copy ]    │
  │    Slab Floors          click C10   1 row           [ Copy ]    │
  │    Other Floors         click C10   1 row           [ Copy ]    │
  │    Glazing              click C10   12 rows         [ Copy ]    │
  │    Doors (opaque)       click C10   2 rows          [ Copy ]    │
  └───────────────────────────────────────────────────────────────┘
```

- `Download PDF` → `POST /api/h1/report`，返回 PDF 文件直接下载
- BRANZ 那一块 → `POST /api/h1/paste-blocks`，返回每个 sheet 的 `anchor`、`row_count`、`tsv`。
  `Copy` 把 `tsv` 放进剪贴板，按钮变 `Copied ✓` 两秒
- Project Details 的 Copy 不同：它是逐格的（`F6` Client、`F7` Project name…），展开成小列表，
  每格一个 Copy

### 接口格式

```json
// POST /api/h1/report    （/api/h1/paste-blocks 用同样的 elements 和 project）
{
  "territorial_authority": "Auckland",
  "project": { "client": "", "project_name": "", "address": "", "designer": "", "date": "", "territorial_authority": "Auckland" },
  "elements": [
    { "element_type": "roof", "label": "Flat ceiling roofing", "area_m2": 60.2, "r_value": 7.18, "heated": false }
  ],
  "constructions": [
    { "name": "Truss, R7.0 + R2.6", "element_type": "roof", "total_r": 7.18,
      "method": "NZS 4214 isothermal planes", "framing_fraction": 0.05,
      "layers": [ { "name": "13 mm plasterboard", "thickness_mm": 13, "r_value": null } ],
      "notes": [] }
  ]
}
```

`elements` 就是清单的每一行；`constructions` 是 ③ 里被用到的做法。层 R 值还没有时传
`null`，PDF 里印成 `—`。

项目信息（Client / Project name / Address / Designer / Date）放在汇总上方一个可折叠的
`Project details` 里，导出前没填的话 `Download PDF` 旁边提示 `Project details are empty —
they print as dashes.`，不阻止下载。

---

## 五、本轮要出的 artboard（共 5 块，桌面 1440px）

1. **Summary + schedule**（卡片只读、清单里 Roof 2 行、Walls 5 行展开）
2. **Schedule — glazing group**（ID / 高 / 宽 / 面积）
3. **Construction picker open**（某一行的做法下拉展开，含 `Enter R manually`）
4. **Export**（PDF 卡 + BRANZ 七行 Copy，其中一个显示 `Copied ✓`）
5. artboard 1 的浅色版

示例数据用这组（一个真实项目的规模）：

| 类型 | Description | 面积 | R |
|---|---|---|---|
| Slab floors | Concrete | 43.3 | 0.70 |
| Other floors | Mid-floor | 27.3 | 3.60 |
| Roof | Flat ceiling roofing | 60.2 | 7.18 |
| Roof | Rafter roofing | 10.3 | 4.44 |
| Walls | Fibre cement 90mm | 63.9 | 2.20 |
| Walls | Fibre cement 140mm | 20.9 | 3.15 |
| Walls | Metal cladding | 19.7 | 2.14 |
| Walls | Stone cladding | 20.9 | 2.11 |
| Walls | Internal wall | 14.4 | 2.08 |
| Glazing | EXW103 … EXW114（12 樘） | 共 46.0 | 0.46 |
| Doors | EXD102 / IN101 | 2.2 / 1.6 | 0.37 / 0.18 |

合计应为 proposed 256.7 W/K、reference 257.1 W/K、PASS。

---

## 六、不要做的事

1. 顶部汇总卡**不要有任何输入框**
2. 不要一个类型只给一个面积——清单按行，一种做法可被多行引用
3. 选了做法的行，R 值不能手改（要改就去改做法，或者切到 `Enter R manually`）
4. 不要在页面里复制 BRANZ 表格的外观或标志；导出是给用户粘贴进他们自己下载的 BRANZ 表
5. 空项目不要预填示例数字
