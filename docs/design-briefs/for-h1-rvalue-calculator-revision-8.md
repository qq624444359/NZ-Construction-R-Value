> **这是什么**：给 Claude Design 的**第八轮**改稿 prompt，针对 `r-value-configurator-v4`。
>
> **用法**：整段粘进 Design 的现有对话，接在[第七轮](for-h1-rvalue-calculator-revision-7.md)之后。
>
> **这一轮三件事**：
> 1. 桥接段读不出"这是木架层"——**容器本身就该是那一层**，而不是一堆参数
> 2. 剖面图**移到右栏并常驻**，鼠标停在某层 → 图上对应部位高亮
> 3. 把第七轮的新方向落成具体数字（檐口几何已经算好了）
>
> **一个可以省掉的工作**：第七轮说的三种天花做法，**热工上是同一个模型**——开槽单层和
> 一块棉盖过框架，组合出来的路径完全一样。差别在会不会 ballooning，不在算法。所以
> **不要为三种做法画三套路径表**。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第八轮

前七轮定下的 token、层编号、两栏路径、四路径网格、表盘单阈值、手填数值、屋面联动、
`—` 占位都保留。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、桥接段就是"木架层"，标题要直接这么写

现在容器叫 `BRIDGED PORTION`，里面是 ④ ⑤ ⑥ 三个编号加一堆输入框。用户看到的是
**一段参数**，看不出这是屋顶的木架层。

### 改法：容器本身就是那一层

```
┌───────────────────────────────────────────────────────────────────────┐
│ 🪵 ④  Roof framing                                               R—   │
│      Truss bottom chord with ceiling insulation between it            │
│                                                                        │
│      [ Truss ][ Rafter ]    Bottom chord ┌──┐×┌──┐mm  Spacing ┌───┐mm │
│                                          │45│ │90│           │900│    │
│                                          └──┘ └──┘           └───┘    │
│                                           width depth     45÷900=5.0% │
│ ─────────────────────────────────────────────────────────────────────  │
│  SHARED ACROSS ALL PATHS                                               │
│    Roof space · ventilated                                        R—   │
│    Ceiling insulation over the framing · 85 mm                    R—   │
│ ─────────────────────────────────────────────────────────────────────  │
│   THROUGH THE TIMBER          │   THROUGH THE INSULATION               │
│   Bottom chord         5.0%   │   Ceiling insulation          95.0%    │
│   90 mm timber           R—   │   R3.6 · 90 mm between members    R—   │
│   ─────────────────────────   │   ───────────────────────────────      │
│   Ceiling battens      7.5%   │   Batten cavity               92.5%    │
│   45 × 45 mm @ 600       R—   │   [ Empty ][ Insulated ]          R—   │
│ ─────────────────────────────────────────────────────────────────────  │
│  FOUR HEAT-FLOW PATHS    …2×2 网格…               Combined        R—   │
└───────────────────────────────────────────────────────────────────────┘
```

要点：

- **容器的标题就是 `④ Roof framing`**，和 ① ② ③ 用同一套编号和字号——它是层序里的
  一层，不是包在几层外面的一个框
- 标题左侧一枚**木材质感的图标**，和其他层的图标明显不同
- 标题下一行副标题，一句话说清这一层是什么：
  `Truss bottom chord with ceiling insulation between it`
- **Truss / Rafter 和构件尺寸放在标题区**，不要塞进左栏卡片——它们定义的是整个这一层
- 容器内部的条目**取消数字编号**，只留名字。它们是 ④ 的两条路径，不是 ⑤ ⑥ 两个新层
- 容器底色用 `--surface-2`，比普通层行深一档；左边一道 3px 的暖色（木材色）竖条，
  和其他层的品牌色区分开
- `BRIDGED PORTION` 这个词降为标题右侧一枚小 chip，配一个 info 图标，
  悬停显示 `Framing bridges the insulation here, so the standard treats it as parallel
  heat paths (NZS 4214 clause 5.7.1).` —— 术语留给需要的人，不占主位

**因此 Ceiling lining 变成 ⑤，Roof perimeter 变成 ⑥。** 层序重新连续。

---

## 二、剖面图移到右栏，常驻，悬停联动

现在剖面图在左栏底部，滚下去就看不见了。它应该在右栏**跟着滚动常驻**。

### 右栏顺序

```
1. Construction R-value 表盘（压缩到一屏能看完）
2. Section — 常驻（position: sticky）      ← 新位置
3. Insulation products
```

剖面图面板高约 360px，`position: sticky; top: 88px`，左栏滚动时它不动。

### 悬停联动

**鼠标停在左栏任一层行 → 剖面图里对应部位高亮，其余降到 40% 不透明。**
反向也要成立：停在图上某个部位 → 左栏对应行高亮。

联动靠显式 id 配对，不要靠顺序猜：

| 左栏行 | `data-layer` | 剖面图里的组 |
|---|---|---|
| ① Roofing | `roofing` | 波形屋面板 |
| ② Underlay | `underlay` | 薄膜 |
| ③ Substrate | `substrate` | 檩条阵列 / ply 板 |
| ④ Roof framing → Bottom chord | `chord` | 下弦 |
| ④ → Ceiling insulation | `insulation` | 保温填充 |
| ④ → Ceiling battens | `battens` | 交叉的 batten |
| ④ → Roof space | `roofspace` | 屋顶空腔 |
| ⑤ Ceiling lining | `lining` | 天花板 |
| ⑥ Roof perimeter | `perimeter` | 檐口那一段 |

- 高亮样式：该组描边 `--brand` 2px + 亮度提升；其余组 `opacity: 0.4`
- **点击某行 = 钉住高亮**，鼠标移开不消失，方便移到图上细看；再点一次取消
- 键盘 focus 到某行的效果和悬停一致
- 没有悬停时**不要预设任何部位变暗**——默认是完整的图

---

## 三、第七轮那两块，现在有真数字了

### 天花做法：三个选项，一套算法

⑤ 那张卡（现在在 ④ 容器里的 `Ceiling insulation`）顶部放三个做法按钮：

```
[ Two layer ]  [ Single layer, notched ]  [ Single layer, fills depth ]
```

**但不要为它们画三套路径表。** 开槽单层和一块棉盖过框架，组合出的四条路径完全一样，
差别在于厚棉不开槽会 ballooning。所以三个选项影响的是：

- 收集哪些字段（双层要两个 R 值，单层要一个）
- 是否出现 ballooning 警告
- 剖面图怎么画（开槽要画出跨过下弦的切口）

路径表和网格**只有一套**。

### 檐口面板：几何已经算好

⑥ Roof perimeter 用这些真实输出出稿（20° 坡、90 mm 椽、无抬升 heel、275 mm 保温、
500 mm 檐口带）：

```
⑥  Roof perimeter                                          500 mm strip

    Roof pitch ┌────┐°   Raised heel ┌───┐mm   Vent gap ┌────┐mm
               │ 20 │                │ 0 │              │ 25 │
               └────┘                └───┘              └────┘
    Strip width ┌─────┐mm
                │ 500 │
                └─────┘
    ──────────────────────────────────────────────────────────────
    Depth at the wall line                              70.8 mm
    Depth at the edge of the strip                     252.8 mm
    Full 275 mm thickness reached                      561 mm in
    Squashed across                        the whole 500 mm strip
    ──────────────────────────────────────────────────────────────
    Compressed R-value ┌─────┐   manufacturer declared
                       │     │
                       └─────┘
    Compression reduces R, and by how much is the manufacturer's
    figure for this product at this thickness — not something this
    tool infers.
    ──────────────────────────────────────────────────────────────
    H1/AS1 lets the roof drop to R3.30 for up to 500 mm in from the
    ceiling perimeter (Table 2.1.2.12, note 4), and never below
    R2.60 anywhere (2.1.2.11 a).
```

**去掉 25 mm 通风间隙**，同一组几何变成 `95.8 mm` 在墙线处、`492 mm` 处达到全厚——
出稿时两张都要，让作者看到通风间隙吃掉的深度有多少。

- `Depth at the wall line` 等三行是**算出来的**，随上面四个输入实时变
- `Compressed R-value` 是空的输入框，**不要预填任何数字**
- 通风间隙是必须留的，但它按输入参与几何；若填 0，在字段下方给一行 `--review`：
  `A ventilation path is still required — entering 0 only means this detail does not
  take depth at the wall line.`

---

## 四、本轮要出的 artboard（共 5 块，桌面 1440px）

1. **Roof — framing layer titled**（第一节，容器就是 ④，木材图标 + 暖色竖条）
2. **Roof — hover on insulation**（左栏那行高亮，右栏剖面图保温部位高亮、其余 40%）
3. **Roof — section pinned, scrolled**（左栏滚到下面，右栏剖面图仍在原位）
4. **Roof perimeter — with and without the 25 mm vent gap**（两栏对照，数字如上）
5. artboard 1 的浅色版

---

## 五、不要做的事

1. 不要再让容器叫 `BRIDGED PORTION` 当主标题——那是术语，不是这一层的名字
2. 不要给容器内部的条目单独编号，它们是 ④ 的路径不是新层
3. 不要为三种天花做法画三套路径表
4. 不要给 `Compressed R-value` 预填数字，也不要自拟折减公式
5. 悬停联动不要靠顺序猜配对，要用显式 id
6. 默认状态下不要预先把任何部位变暗
