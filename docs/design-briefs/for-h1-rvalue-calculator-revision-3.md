> **这是什么**：给 Claude Design 的**第三轮**改稿 prompt，接在
> [第二轮](for-h1-rvalue-calculator-revision-2.md) 之后，针对 `r-value-configurator-v2`。
>
> **用法**：整段粘进 Design 的现有对话。
>
> **这一轮四件事**：
> 1. 做成**能点的活页面**——v2 是静态 artboard，作者无法验证交互（Design 自己的备注也写了尚未接线）
> 2. **屋面联动**：选屋面类型自动带出 underlay 和 substrate（longrun → roof paper + purlins，shingle → D226+ + CHH Ecoply 15 mm）
> 3. **纠正第二轮的错误**：屋顶不是两个桥接段，是**一个**桥接段、四条路径（H1/AS1 2.1.3.2）
> 4. **框架占比必须算出来**：v2 的 12.0% 和 9.4% 对不上它自己标的几何
>
> 联动规则的唯一来源是 `backend/src/h1/rvalue/data/roofing_systems.yaml`，下面的 JSON 是它的导出。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第三轮

基于 `r-value-configurator-v2`。前两轮定下的 token、导航、部位选项卡、产品面板、合规文案、`—` 占位、gable 剖切图都保留。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、做成一个能点的页面，而不是一组静态状态

v2 的 10 块 artboard 各自画了一个状态，但控件之间没有接线——作者在 Present 模式里点下拉、点 heel height，什么都不会变，所以没法验证交互是否正确。

这一轮只要**一个活页面**（`examples/r-value-configurator-v3.html`），由一个状态对象驱动：

```js
const state = {
  element: "roof",
  roofing: { family: "longrun", profile: "corrugate" },
  underlay: "roof_paper",
  substrate: "purlins",
  structure: "truss",
  chord: { widthMm: 45, spacingMm: 900, heelMm: 200 },
  battens: { widthMm: 45, spacingMm: 600, cavity: "empty" },
  insulationR: 3.6,
  view: "eaves",
};
```

- **每个控件只改 `state`**，然后调用一次 `render()`
- `render()` 从 `state` 推出所有派生值（占比、路径表、联动行的锁定状态、gable 几何）并重画
- 不要在控件的事件里直接改 DOM 里别的地方——那样一定会有状态对不上的地方
- 页面顶部放一个默认折叠的 `State` 调试抽屉，实时显示 `JSON.stringify(state, null, 2)`，方便作者核对

原有的 10 块 artboard 不用删，但**新页面才是作者验证用的那个**。

---

## 二、屋面联动：选屋面，下面的层跟着定

Longrun 金属屋面和 shingle 屋面不是同一套构造换个面层。从外到内：

- **Longrun**：longrun roofing → roof paper → purlins → truss
- **Shingle**：shingles → D226+ roofing underlay → CHH Ecoply Roof Ply 15 mm DD T&G

选了屋面，underlay 和 substrate 就应该自动定下来。**Tile 这一轮不做**，以后再加。

### 规则（逐字使用，不要改）

```json
{
  "substrates": {
    "purlins": "Purlins",
    "ecoply_roof_ply_15": "CHH Ecoply Roof Ply 15 mm DD T&G"
  },
  "underlays": {
    "roof_paper": "Roof paper",
    "d226_plus": "D226+ roofing underlay"
  },
  "families": {
    "longrun": {
      "label": "Longrun metal roofing",
      "profiles": { "corrugate": "Corrugate", "trapezoidal": "Trapezoidal" },
      "underlay":  { "confirmed": true, "default": "roof_paper", "allowed": ["roof_paper"] },
      "substrate": { "confirmed": true, "default": "purlins",    "allowed": ["purlins"] }
    },
    "shingle": {
      "label": "Shingle roofing",
      "profiles": { "asphalt_shingle": "Asphalt shingle" },
      "underlay":  { "confirmed": true, "default": "d226_plus",          "allowed": ["d226_plus"] },
      "substrate": { "confirmed": true, "default": "ecoply_roof_ply_15", "allowed": ["ecoply_roof_ply_15"] }
    }
  }
}
```

### ① Roofing 行改成两级选择

```
① Roofing
   [ Longrun ][ Shingle ]                 ← 分段控件，选屋面类型
   [ Corrugate ▾ ]                        ← 只列该类型下的 profile
```

切换类型时：profile 自动选为该类型的第一个；substrate 和 underlay 按规则重设。

### ② Underlay / ③ Substrate 行的三种状态

| 规则 | 行的样子 |
|---|---|
| `confirmed` 且 `allowed` 只有一项 | **锁定行**：不显示下拉，显示选项名 + 锁图标 + 一枚 chip `Set by Longrun metal roofing`（用当前类型的 label） |
| `confirmed` 且 `allowed` 多于一项 | 下拉，只列 `allowed` 里的选项，默认选 `default` |
| `confirmed: false` | `--review` 左条 + 文案 `No rule set up for <family label, lower case> yet — choose it yourself.`，下拉列出该层**全部**选项，初始为空。**当前规则里没有这种情况**，但以后加新屋面类型时会出现，组件要支持 |

当类型切换导致某行的值变了，那一行做一次 400ms 的品牌色背景淡出高亮，让作者看到"这里被改了"。

### Gable 剖切图跟着变

- **Longrun**：truss 上架檩条阵列，roof paper 画成在檩条之间略微下垂的薄膜，上面是波形/梯形 longrun
- **Shingle**：檩条换成**一整张连续的 15 mm ply 板**（T&G 企口接缝可见），上面一层 D226+ 薄膜，再上面是分层错缝的 shingle

---

## 三、纠正：屋顶是一个桥接段、四条路径

**第二轮 prompt 在这里写错了**，v2 照着做成了 `BRIDGED PORTION 1 OF 2` / `2 OF 2`。

H1/AS1 **2.1.3.2**（它替换了 NZS 4214 的 5.7.1 a）规定：多个桥接层**直接相邻**时，必须全部归入**同一个**桥接段。Ceiling batten 直接钉在下弦底面，两者相邻——所以是**一个**桥接段。

下弦和 batten 在平面上是垂直交叉的网格，所以这一段里有**四条**热流路径，面积占比是两个占比的乘积：

```
╔══ BRIDGED PORTION ═══════════════════════════════════════════════════╗
║  Shared across all paths:  Roof space · ventilated                    ║
║ ─────────────────────────────────────────────────────────────────────  ║
║                   │  Batten  7.5%          │  Batten cavity  92.5%     ║
║ ──────────────────┼────────────────────────┼─────────────────────────  ║
║  Chord     5.0%   │  Chord × Batten   0.4% │  Chord × Cavity    4.6%   ║
║                   │  R—                    │  R—                       ║
║ ──────────────────┼────────────────────────┼─────────────────────────  ║
║  Insulation 95.0% │  Insulation × Batten   │  Insulation × Cavity      ║
║                   │  7.1%   R—             │  87.9%   R—               ║
╠══════════════════════════════════════════════════════════════════════╣
║  1/Rb = 0.004/R— + 0.046/R— + 0.071/R— + 0.879/R—      Combined  R—   ║
╚══════════════════════════════════════════════════════════════════════╝
```

- 表头左列是下弦方向（Chord / Insulation），上行是 batten 方向（Batten / Batten cavity）
- 四个格子各显示：路径名、面积占比（等宽）、路径 R（现在都是 `—`）
- 顶部一条 `Shared across all paths`：紧挨着桥接段的保温层或空气层（这里是 roof space）按 2.1.3.2 (i) 归入桥接段，出现在每条路径上——所以它**在容器里面**，不在外面
- 容器上方的 underlay 不打断桥接段（薄膜按规则视为不存在），但它本身仍作为一层单独列出
- 容器下方的 plasterboard 在桥接段之外，单列

控件（Truss/Rafter、heel height、chord 尺寸、batten 间距、cavity Empty/Insulated）放在容器上方的一条参数栏里，不要塞进格子。

墙体只有一个框架层，仍然是两列，不变。

---

## 四、框架占比必须由几何算出来

v2 写 `90 mm timber · 900 mm centres` 而占比是 **12.0%**；45 mm 宽的下弦在 900 中距下是 **5.0%**，12.0% 需要约 108 mm 宽。Batten `45 mm` 在 600 中距下是 **7.5%**，v2 写 9.4%。

- **构件宽度必须是一个显式输入**：`Member width` 数字框，默认 `45`，单位 mm
- 占比 = 宽度 ÷ 间距，**旁边显示算式**：`45 ÷ 900 = 5.0%`
- 深度（90 mm）和宽度是两个字段，不要合在一句 "90 mm timber" 里——算占比的是宽度

---

## 五、给作者的验证清单

在 v3 页面底部放一个默认折叠的 `Interaction checklist`，逐条列出下面这些，作者自己点一遍：

1. 选 **Shingle** → Underlay 变成锁定的 `D226+ roofing underlay`，Substrate 变成锁定的 `CHH Ecoply Roof Ply 15 mm DD T&G`，两行各闪一下，chip 写 `Set by Shingle roofing`
2. Profile 下拉只剩 `Asphalt shingle`
3. Gable 图里檩条消失，出现一整张 ply、D226+ 薄膜和错缝 shingle
4. 切回 **Longrun** → Profile 回到 `Corrugate`，Underlay 回到锁定的 `Roof paper`，Substrate 回到锁定的 `Purlins`
5. Longrun 下切换 Corrugate ↔ Trapezoidal → gable 图波形变化，Underlay 和 Substrate 不变
6. Chord 间距 900 → 600 → 占比 5.0% → 7.5%，算式同步；四个格子的占比同步
7. Batten 间距 600 → 400 → Batten 占比 7.5% → 11.3%
8. 占比四格加起来始终是 100.0%
9. Heel height 200 → 90，保温 3.60（175 mm）→ 檐口保温画成压扁的楔形，第一轮的冲突提示出现
10. 打开 `State` 抽屉，以上每一步里 JSON 都跟着变

---

## 六、不要做的事

1. 不要把屋顶再拆成两个桥接段
2. 不要手填任何占比
3. 不要给 `confirmed: false` 的层自动填一个"看起来合理"的值
4. 不要改动规则 JSON 里的 id 和 label
5. 不要用 `--fail` 表示未确认——那是缺规则，不是不合规，用 `--review`
