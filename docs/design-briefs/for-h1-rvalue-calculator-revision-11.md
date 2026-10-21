> **这是什么**：给 Claude Design 的**第十一轮**改稿 prompt。只改剖面图里的**通风路径**。
>
> **用法**：整段粘进 Design 的现有对话。
>
> **问题**：剖面图现在把 `Roof space · ventilated` 标在桁架空间里，并在檐口保温上方画了
> 一道 25 mm 通风缝——两种屋面都这么画。这不对：
>
> - **Longrun 金属屋面**：通风在**檩条深度里**——屋面板和下垂的 roof paper 之间。
>   roof paper 以下的桁架空间不是通风路径（作者确认）
> - **Shingle 屋面**：板材、underlay 直接压在 ply 上，**上面没有空腔**；通风走的是
>   **ply 下面的桁架空间**，从檐口进，从屋脊出
>
> **来源**（shingle 部分）：BRANZ Appraisal No. 529 (2022) *GAF Asphalt Roof Shingles*
> 4.2、15.2；GAF 屋脊通风产品的安装说明。只取事实数字，不复制它们的图，不用品牌 logo。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第十一轮

前十轮的内容全部保留。这一轮只改**右栏剖面图的通风表达**，以及随之而来的一个默认值。

全站文案英文，下面给出的 copy 逐字使用。

---

## 一、通风路径跟着屋面系列走

剖面图的通风画法必须由 ① Roofing 的系列决定，和 ② ③ 的联动一样自动切换。

### Longrun metal roofing —— 通风在檩条深度里

```
      ╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲      ← corrugate / trapezoidal sheet
     ▯ ⇢⇢⇢ ▯ ⇢⇢⇢ ▯ ⇢⇢⇢ ▯    ← 气流箭头沿坡向上，在两根檩条之间
      ╲___╱  ╲___╱  ╲___╱    ← roof paper 搭在檩条上、在两根之间下垂
   ━━━━━━━━━━━━━━━━━━━━━━━  ← truss top chord
            Roof space
```

- 气流箭头**只画在屋面板和下垂的 roof paper 之间**，沿坡向上：从檐口屋面板下进入，
  到屋脊盖板下排出
- 标注：`Ventilated within the purlin depth`
- roof paper 以下的桁架空间标注只写 `Roof space`，**不写 ventilated，不画箭头**
- 檐口处保温上方**不画通风缝**

### Asphalt shingle roofing —— 通风在 ply 下面的桁架空间

```
                 ┌ ridge cap ┐
                 │ ridge vent│  ⇡ 排气
      ───────────┘  ▯slot▯   └──────────
  shingles ▬▬▬▬▬▬▬▬            ▬▬▬▬▬▬▬▬
  D226+    ────────            ────────
  15 mm ply ════════            ════════   ← 直接钉在桁架上弦，上面没有空腔
            ⇡⇡ 气流沿 ply 下表面向上 ⇡⇡
                   Roof space
  ⇢ 10 mm air gap at the fascia（进气）
```

- 气流箭头：**檐口 fascia 处进 → 沿 ply 下表面、保温上方向上 → 屋脊排出**
- 标注三处：
  - 檐口：`10 mm air gap at the fascia`
  - 桁架空间：`Roof space · ventilated`
  - 屋脊：`Ridge vent over a slot in the ply`
- shingle / underlay / ply 之间**不画任何空腔或箭头**，三层贴合

### 屋脊小插图

现在的剖面图只画檐口，看不到出风口。在剖面图右上角加一个约 140 × 90 px 的**屋脊插图**
（细边框，标 `Ridge`），和主图一起按屋面系列切换：

- Longrun：屋脊盖板下，檩条间的气流从两侧汇到屋脊排出
- Shingle：ply 在屋脊处开槽，槽上是 ridge vent，再上是 ridge cap shingles。
  尺寸标注：`25 mm slot each side of the ridge`

这样"从哪进、从哪出"在一张图里读得完。

### Rafter（斜顶/skillion）+ shingle

选 `Rafter` 且屋面是 shingle 时，ply 下面、保温上面必须画一道**连续的 25 mm 空气层**，
标注 `25 mm clear ventilated gap`。这是 BRANZ Appraisal 529 对 skillion 屋面的要求。

---

## 二、悬停联动加一组 `ventilation`

| 左栏行 | `data-layer` | 剖面图里的组 |
|---|---|---|
| ③ Substrate（longrun 时是 Purlins） | `substrate` + `ventilation` | 檩条 + 檩条间气流 |
| ④ → Roof space（shingle 时） | `roofspace` + `ventilation` | 桁架空间 + 气流 |

气流箭头单独成一组 `ventilation`，悬停上面两行时和对应部位一起高亮。
Longrun 时悬停 `Roof space` **不点亮箭头**——那里不是通风路径。

---

## 三、⑥ Roof perimeter 的 `Vent gap` 默认值跟着变

第八轮檐口面板的 `Vent gap` 默认 25 mm，它会从檐口可用深度里扣掉。但这只在**气流要从
保温上方经过**时才成立：

| 屋面 | 气流在哪 | `Vent gap` 默认 | 字段下方说明 |
|---|---|---|---|
| Shingle | ply 下、保温上 | `25` mm | `Air enters at the fascia and runs under the ply to the ridge, so this gap is kept clear above the insulation.` |
| Longrun | 檩条深度里、roof paper 上 | `0` mm | `Longrun roofing ventilates within the purlin depth, above the roof paper — the eaves insulation does not give up depth for it.` |

- 两种情况都**可以手改**
- 切换屋面系列时，若用户手改过这个值，**不要覆盖**，只在字段旁闪一个
  `Default for this roofing is 0 mm` 之类的提示
- 第八轮"填 0 时给 `--review`"那条规则**只对 shingle 生效**

Longrun 默认 0 之后，第八轮那组示例（20° 坡、90 mm 上弦、275 mm 保温、500 mm 檐口带）
回到 `95.8 mm` 在墙线处、`492 mm` 处达到全厚。

---

## 四、本轮要出的 artboard（共 4 块，桌面 1440px）

1. **Section — longrun**（檩条间气流、roof paper 下垂、roof space 无箭头、屋脊插图）
2. **Section — shingle**（fascia 进气、ply 下气流、屋脊开槽 + ridge vent）
3. **Section — rafter + shingle**（25 mm 连续空气层）
4. **Hover ③ Purlins（longrun）**（檩条和气流一起高亮，其余 40%）

---

## 五、不要做的事

1. 不要让两种屋面共用一套通风画法
2. Longrun 时不要在 roof space 里画箭头或写 ventilated
3. Shingle 时不要在 shingle、underlay、ply 之间画空腔
4. 不要用 GAF 或任何产品的 logo 和产品名，图上只写通用名（`Ridge vent`）
5. 切换屋面时不要覆盖用户手填的 `Vent gap`
