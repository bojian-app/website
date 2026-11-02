# 博简简历模板开发规范 V2

> 协议版本：V2。新模板采用 V2，仅接受 HTML／HTM 源文件。  
> 整理日期：2026-10-30。  
> 适用对象：博简模板开发者、模板审核人员及平台渲染／导出开发人员。  
> 本文是模板制作规范，不是 APP 项目开发约定。

## 1. 版本与适用范围

本规范用于制作博简 V2 单栏简历模板。开发者负责模块外观与排版，平台负责数据、顺序、富文本填充、分页和导出。

- 新建或替换模板源文件仅接受 UTF-8 HTML／HTM，不支持 Word（DOC／DOCX）上传。
- 既有 V1 模板继续按原版本渲染；重新上传源文件时需按 V2 迁移。
- Word／PDF 是简历导出格式，与允许上传的模板源文件格式不同。
- V2 模板需要支持 V2 的 APP，旧客户端会提示升级。

## 2. 交付文件与资源

### 2.1 文件格式【现有能力】

- 接受 `.html`、`.htm`。
- 单个源文件不得超过 **8 MB**；这是上传源文件限制，不是导出成品的大小说明。
- 至少包含一个平台支持的模板字段。
- 推荐自包含 HTML，CSS 写在文件内的 `<style>` 中。
- 不接受 Word 文件，也不能把 DOCX 改成 HTML 扩展名上传。内容必须是有效的 UTF-8 HTML。

### 2.2 资源和交互限制【现有能力／制作要求】

- 不引用外部脚本、样式文件、在线字体或远程装饰图片。
- 装饰图片应内嵌为 `data:` 资源，不得使用开发者电脑上的文件路径。
- 不使用 JavaScript、事件属性、iframe、表单或输入控件实现模板逻辑；这些能力不会作为模板功能执行，相关内容可能被移除或拒绝。
- 不使用 `input`、`textarea`、`button` 模拟简历编辑器。模板是简历内容的展示结构，编辑功能由平台提供。
- 不将整张简历或正文制作成图片。
- 字体、图片、图案和其他素材应具有合法使用权限。
- 不在模板源文件中保存真实用户的个人资料、访问凭据或私有资源地址。

## 3. V2 模块协议【V2】

### 3.1 模块标识

每个模块使用独立的根元素，并通过 `data-bj-section` 声明身份。

```html
<section data-bj-section="projects">
  <h2>项目经历</h2>
  <!-- 项目循环与正文 -->
</section>
```

| 模块标识 | 模块名称 | 排序规则 |
| --- | --- | --- |
| `personal_info` | 个人信息 | 固定在顶部 |
| `job_expectation` | 求职意向 | 跟随用户保存的顺序 |
| `self_evaluation` | 自我评价 | 跟随用户保存的顺序 |
| `work_experiences` | 工作经历 | 跟随用户保存的顺序 |
| `projects` | 项目经历 | 跟随用户保存的顺序 |
| `educations` | 教育经历 | 跟随用户保存的顺序 |
| `skills` | 专业技能 | 跟随用户保存的顺序 |
| `certifications` | 证书与荣誉 | 跟随用户保存的顺序 |

### 3.2 结构要求

- V2 标准模板应声明上述全部模块。用户未填写的模块由平台隐藏，不要求模板作者删掉模块。
- 每个模块标识只能出现一次，不允许未知标识、重复模块或模块相互嵌套。
- 各模块根元素应处于同一个内容容器下，方便整体重新排序。
- 模块标题、内容、装饰和分隔线都应放在模块内部，随模块一起移动或隐藏。
- 不根据模块的固定序号设计关键样式，例如不能依赖“第三个模块一定是工作经历”。
- 平台按用户保存的顺序渲染；历史简历没有顺序时，使用平台默认顺序。
- 空模块整体隐藏，不能留下标题、分隔线或固定占位高度。
- 模块是否为空由实际内容决定，不能因为缺少公司名或项目名就隐藏已经填写的其他正文。

建议默认顺序为：求职意向、自我评价、工作经历、项目经历、教育经历、专业技能、证书与荣誉。

### 3.3 单栏与双栏

V2 首版标准模板采用单栏。双栏涉及跨栏排序、阅读顺序和 Word 导出映射，应另行定义协议；在该协议发布前，不宣称双栏具备与单栏相同的模块拖拽排序能力。

## 4. 基础字段

### 4.1 字段语法【现有能力】

使用 `{{字段名}}` 插入文字。字段名使用平台提供的小写标识，不可自行更名、计算或访问数据库对象。

```html
<h1>{{name}}</h1>
<p>{{#if phone}}电话：{{phone}}{{/if}}</p>
```

文字字段放在元素内容中，不要放入 HTML 属性。例如 `href="{{auxiliary}}"` 和 `class="{{position}}"` 不是现有支持的写法。

现有属性占位例外仅为图片 `alt`／`title` 中的 `{{photo}}`。

### 4.2 全局字段表

| 字段 | 含义 | 状态与注意事项 |
| --- | --- | --- |
| `name` | 姓名 | 现有；循环外使用 |
| `phone` | 电话 | 现有 |
| `email` | 邮箱 | 现有 |
| `birth_date` | 出生日期或年龄的显示文字 | 现有；不保证始终是日期格式 |
| `birth_date_label` | 年龄／出生日期对应的标签 | V2；与 `birth_date` 配对 |
| `gender` | 性别显示文字 | 现有 |
| `position` | 期望岗位 | 现有 |
| `city` | 期望城市 | 现有 |
| `industry` | 期望行业 | 现有 |
| `salary` | 期望薪资 | 现有；不能假定始终是纯数字 |
| `preference` | 自我评价／求职偏好正文 | 现有历史字段名；V2 放入自我评价模块 |
| `photo` | 照片占位 | 现有；按照片专用规则使用，不是普通 URL 字段 |

### 4.3 展示值与前缀

- 姓名为顶部主要信息。
- 期望岗位只放在求职意向模块，顶部不重复展示。
- 电话、邮箱、性别等使用明确前缀，例如“电话：”“邮箱：”“性别：”。
- 前缀与字段放在同一个条件中，字段为空时一起隐藏。
- 基本信息及求职意向的信息项采用布局间距分隔，不使用 `·`、连续空格或大量全角空格撑开位置。
- 不自行给薪资拼接“元”“K”“万”或“／月”，除非后续字段协议明确提供单位。
- 不在模板中计算年龄、修改日期格式、推算任职状态或生成“至今”。

V2 年龄／日期示例：

```html
<p>{{#if birth_date}}{{birth_date_label}}：{{birth_date}}{{/if}}</p>
```

平台应保证显示值存在时提供正确标签；V1 没有 `birth_date_label`，不能直接使用该示例。

## 5. 经历集合与条目字段

### 5.1 集合名称【现有能力】

| 集合 | 对应内容 |
| --- | --- |
| `educations` | 教育经历 |
| `work_experiences` | 工作经历 |
| `projects` | 项目经历 |
| `skills` | 专业技能 |
| `certifications` | 证书与荣誉 |

### 5.2 条目字段映射【现有能力】

| 集合 | `title` | `subtitle` | `auxiliary` | `detail` | `secondary_detail` |
| --- | --- | --- | --- | --- | --- |
| `educations` | 学校 | 学历 | 专业 | 在校经历 | 论文说明 |
| `work_experiences` | 公司 | 职位 | 行业 | 工作内容与成果 | 当前为空 |
| `projects` | 项目名称 | 项目角色 | 项目链接文字 | 项目描述 | 项目成果 |
| `certifications` | 证书名称 | 颁发机构 | 当前为空 | 当前为空 | 当前为空 |
| `skills` | 使用 `name` 表示技能名称 | 不适用 | 不适用 | 技能描述 | 不适用 |

`start_date`、`end_date` 用于实际提供日期的经历。没有数据的字段按空值处理，不能自行补全。证书的单一获证日期不应被误当成完整起止时间。

作用域要求：

- 循环外的 `name` 是本人姓名。
- `skills` 循环内的 `name` 是技能名称。
- 公司、学校、项目和证书名称统一使用循环内的 `title`，不要直接写 `company`、`institution` 等内部数据字段。
- 不依赖当前实现偶然发生的作用域回退；在对应循环中使用对应条目字段。

### 5.3 日期显示字段【V2】

新增循环内字段 `date_range`，由平台统一生成可直接展示的日期文字。

| 场景 | 输出示例 |
| --- | --- |
| 已结束的经历 | `2022-05-10 — 2025-12-10` |
| 按平台规则显示至今 | `2022-05-10 — 至今` |
| 只有一个有效日期 | 只输出已有日期，不添加悬空连接符 |
| 没有日期 | 空字符串 |
| 证书的获证日期 | 按实际提供的单一日期展示 |

```html
<p>{{#if date_range}}{{date_range}}{{/if}}</p>
```

平台负责读取正确的业务日期字段、识别已确认的“至今”规则及处理历史数据。该字段不允许模板修改用户事实。原有起止日期字段继续保留，供有明确排版需要的模板使用。

## 6. 循环与条件

### 6.1 循环【现有能力】

```html
<p>{{#work_experiences}}</p>
<article class="resume-entry">
  <h3>{{title}}</h3>
  <p>{{subtitle}}</p>
  <p>{{detail}}</p>
</article>
<p>{{/work_experiences}}</p>
```

- 循环起止标记各占一个独立元素。
- 起止元素必须是同一父容器下的兄弟元素。
- 不跨表格单元格设置起止标记。
- 不嵌套经历循环。
- 不用重复写死的 HTML 代替循环，也不只预留第一条经历的位置。

### 6.2 条件【现有能力】

```html
<p>{{#if phone}}电话：{{phone}}{{/if}}</p>
<p>{{#if phone|email}}联系方式{{/if}}</p>
```

- `|` 表示任意一个字段有内容。
- 不支持 `else`、比较运算、函数或 JavaScript 表达式。
- 行内条件放在同一段落内。
- 整块条件的起止元素必须为兄弟节点。
- 条件可包围经历集合；空数组及没有实质内容的条目按无内容处理。
- 历史问号条件可兼容，但新模板统一使用 `{{#if ...}}`。

### 6.3 V1 的空模块隐藏写法

V1 不会因为集合为空而自动删除循环外的标题，因此应包围整个模块：

```html
<section>
  <p>{{#if projects}}</p>
  <h2>项目经历</h2>
  <p>{{#projects}}</p>
  <article>
    <h3>{{title}}</h3>
    <p>{{detail}}</p>
  </article>
  <p>{{/projects}}</p>
  <p>{{/if}}</p>
</section>
```

V2 由 `data-bj-section` 对应的模块语义统一决定整块显示与隐藏，不要求开发者重复实现相同判断。

## 7. 正文与富文本

### 7.1 通用正文要求【制作要求】

- 正文保留用户输入的段落、编号和换行，不擅自改写或补充内容。
- 使用正常文档流，不按视觉上的每一行拆成独立定位元素。
- 同一条经历的长正文使用连续容器，不按预期页数预先分成多个容器。
- 不设置固定正文高度、行数限制、省略号或 `overflow: hidden` 截断内容。
- 不通过正文截图、逐字定位、逐行绝对定位模拟排版。
- V1 的 `detail` 等字段目前主要提供纯文本，不能宣称完整继承编辑器的所有富文本格式。

### 7.2 富文本插槽【V2】

普通文字继续使用 `{{name}}`。长正文改用专用插槽：

```html
<div data-bj-rich="detail"></div>
```

允许的插槽与作用域：

| 位置 | 插槽 |
| --- | --- |
| 自我评价模块 | `preference` |
| 工作经历循环 | `detail` |
| 项目经历循环 | `detail`、`secondary_detail` |
| 教育经历循环 | `detail`、`secondary_detail` |
| 技能循环 | `detail` |

插槽元素应为空，由平台填充。不要同时输出 `{{detail}}` 和 `data-bj-rich="detail"`，否则会形成重复内容。

平台应：

1. 优先使用用户保存的结构化富文本；只有纯文本时转换成段落与换行。
2. 生成安全、语义明确的段落、列表及行内格式，不将任意用户 HTML 原样注入。
3. 保留加粗、斜体、下划线、删除线、有序列表和无序列表。
4. 正确处理列表起始序号、连续编号及正文中的手动换行。
5. 空插槽不产生可见占位文字或多余间距。

格式职责：模板控制基础字号、颜色、行距、段距及列表缩进；用户富文本控制局部强调。基础字体由平台根据预览与导出场景处理。不得通过强制样式清除用户加粗、斜体等格式。

### 7.3 正文分组【V2】

```html
<div data-bj-body>
  <div data-bj-rich="detail"></div>
  <div data-bj-rich="secondary_detail"></div>
</div>
```

- `data-bj-body` 声明一条经历的完整正文范围。
- 项目的介绍、技术栈、职责、描述及成果，按原始内容顺序归入同一正文区域。
- 项目描述和项目成果属于两个来源字段，但可以通过上述分组形成连续编辑区域。
- 分组内部允许多个自然段或列表，不能将“同一个区域”理解为删除所有换行、拼成一段文字。
- 分组不能跨越不同经历条目，也不能包围其他模块。
- 标题、日期等元信息放在正文分组外。
- 不在分组中手工插入分页符。

该标识表达内容语义；具体 Word 控件或文档对象的生成由平台负责。模板作者不需要制作跨页浮动文本框。

## 8. 照片

### 8.1 HTML【现有能力】

默认照片占位：

```html
<p class="resume-photo">{{photo}}</p>
```

需要保留自定义图片样式时，可使用图片元素，并将 `alt` 或 `title` 设置为 `{{photo}}`。占位资源不是最终用户照片，平台会替换实际来源。

### 8.2 布局要求

- 保持照片比例，明确选择等比适配或裁剪，不拉伸人像。
- 用户没有照片时移除占位照片，不展示示例头像或破损图片。
- 照片附近不能依赖必须有头像才能成立的固定占位布局。
- 简历头像地址、鉴权与缓存刷新由平台负责，不让模板作者拼接或硬编码地址。
- 不使用 `src="{{photo}}"`；这不是现有属性占位协议。

## 9. 字体、尺寸与排版

### 9.1 字体

- APP 正式预览使用本机字体，由平台统一处理。
- 模板可控制字号、字重、颜色和行距，不依赖某款特殊字体的精确字符宽度。
- 不加载在线字体，不为字体资源编写脚本。
- 导出字体由平台选择并处理兼容性；Word、PDF 与预览的字体差异不得造成内容缺失或重叠。
- 不使用字体中的私有图标字符承担必要信息，避免缺字导致信息丢失。

### 9.2 页面与宽度

- 使用 A4 纵向页面，优先采用单栏自然布局。
- 用 `@page` 明确声明四边页边距。
- 文字区域使用模块可用宽度，不依赖当前短文本的紧贴宽度。
- 姓名、公司名、学校名和项目名较长时允许自然换行。
- 元信息和日期之间保留间距；不能相互遮挡。
- 链接、邮箱及连续英文应能合理换行。
- 不用连续空格、制表符或空行模拟页面布局。

### 9.3 分页

- 模块标题尽量与后续内容保持在一起。
- 小型标题和元信息组可以避免内部断页，长正文应允许跨页。
- 不给整个经历模块或长正文设置 `break-inside: avoid`。
- 不为每条经历预留固定一页，也不为固定示例内容手工调整分页。
- 不覆盖平台分页节点：`#flow`、`#pages`、`.flow`、`.paper`、`.inner`。
- 自定义 CSS 使用自己的类名前缀，避免污染平台容器。

当前渲染器对过多条目和页数设有保护限制。模板不能通过隐藏内容规避限制；出现限制错误时应明确反馈，由平台处理。

## 10. Word 与 PDF 导出协议【V2 导出要求】

### 10.1 内容语义

平台应先建立包含模块、条目、字段、段落、列表及格式的统一内容模型，再分别生成预览、PDF 和 Word。

不能只根据预览截图、绘制坐标或视觉换行结果反推用户的原始正文结构。

### 10.2 Word

- 使用可连续编辑的文档内容组织正文，不按每一视觉行生成独立文本对象。
- 同一个 `data-bj-body` 的内容保持为一个连续正文区域，内部保留自然段与列表。
- 正文跨页后仍属于同一个区域，不因页面变化拆成互不关联的对象。
- 增删正文后，后续内容应正常顺移。
- 页码随实际分页更新，不能写死为预览时的页码。
- 不要求使用某一种“跨页输入框”实现；采用何种文档结构由平台根据 Word／WPS 兼容验证决定。

首版支持的样式范围：基础字体映射、字号、字重、颜色、段落及列表格式、段距、行距、页边距、照片和基础对齐。复杂阴影、滤镜、变形、任意绝对定位及多层装饰效果不承诺与 HTML 逐像素一致。

### 10.3 PDF

- 保持稳定的 A4 页面和视觉布局。
- 正文应可选择、复制，不能整体栅格化为图片。
- 不遗漏跨页文字、图片或条目。

### 10.4 一致性边界

预览、PDF、Word 必须保持内容、模块顺序、条目顺序和信息层级一致。由于字体及排版引擎不同，Word 的换行和页数可以与 PDF 不完全相同，但不能缺失内容、出现重叠或改变语义。

如果某种模板效果无法满足 Word 的基本可编辑性，应在发布前明确限制或调整模板，不能静默输出破损文件。

## 11. 完整 V2 HTML 示例【V2】

下面是包含全部标准模块的单栏参考模板。它使用 `birth_date_label`、`date_range`、`data-bj-section`、`data-bj-rich`、`data-bj-body` 等 V2 能力。请使用本规范提供的完整示例，并在平台检查实际预览与导出。

源文件中的模块顺序为默认顺序；V2 平台应在填充时按用户保存的顺序重排。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>博简标准单栏模板</title>
  <style>
    @page {
      size: A4;
      margin-top: 16mm;
      margin-right: 16mm;
      margin-bottom: 16mm;
      margin-left: 16mm;
    }
    .bj-resume { color: #243047; font-size: 10.5pt; line-height: 1.5; }
    .bj-resume h1, .bj-resume h2, .bj-resume h3, .bj-resume p { margin: 0; }
    .bj-header { display: flex; align-items: flex-start; gap: 18px; }
    .bj-personal { flex: 1; min-width: 0; }
    .bj-name { font-size: 24pt; font-weight: 600; margin-bottom: 10px !important; }
    .bj-photo { flex: none; }
    .bj-photo:empty { display: none; }
    .bj-photo img { width: 25mm; height: 30mm; object-fit: cover; }
    .bj-info, .bj-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; }
    .bj-info p:empty, .bj-meta p:empty { display: none; }
    .bj-section { margin-top: 18px; }
    .bj-section h2 {
      font-size: 12pt; color: #2463a6; font-weight: 600;
      margin-bottom: 9px; break-after: avoid;
    }
    .bj-entry { margin-bottom: 14px; }
    .bj-entry h3 { font-size: 12pt; font-weight: 600; break-after: avoid; }
    .bj-meta { color: #667085; font-size: 9.5pt; margin-top: 3px; }
    .bj-dates { margin-left: auto !important; }
    .bj-body { margin-top: 6px; }
    .bj-body p { white-space: pre-wrap; overflow-wrap: anywhere; margin-bottom: 5px; }
    .bj-body ul, .bj-body ol { margin: 0 0 5px; padding-left: 1.5em; }
    .bj-body li { overflow-wrap: anywhere; }
    .bj-resume h1, .bj-resume h3, .bj-info p, .bj-meta p { overflow-wrap: anywhere; }
  </style>
</head>
<body>
<main class="bj-resume">
  <header class="bj-header" data-bj-section="personal_info">
    <div class="bj-personal">
      <h1 class="bj-name">{{name}}</h1>
      <div class="bj-info">
        <p>{{#if phone}}电话：{{phone}}{{/if}}</p>
        <p>{{#if email}}邮箱：{{email}}{{/if}}</p>
        <p>{{#if birth_date}}{{birth_date_label}}：{{birth_date}}{{/if}}</p>
        <p>{{#if gender}}性别：{{gender}}{{/if}}</p>
      </div>
    </div>
    <p class="bj-photo">{{photo}}</p>
  </header>

  <section class="bj-section" data-bj-section="job_expectation">
    <h2>求职意向</h2>
    <div class="bj-info">
      <p>{{#if position}}期望职位：{{position}}{{/if}}</p>
      <p>{{#if city}}期望城市：{{city}}{{/if}}</p>
      <p>{{#if industry}}期望行业：{{industry}}{{/if}}</p>
      <p>{{#if salary}}期望薪资：{{salary}}{{/if}}</p>
    </div>
  </section>

  <section class="bj-section" data-bj-section="self_evaluation">
    <h2>自我评价</h2>
    <div class="bj-body" data-bj-body>
      <div data-bj-rich="preference"></div>
    </div>
  </section>

  <section class="bj-section" data-bj-section="work_experiences">
    <h2>工作经历</h2>
    <p>{{#work_experiences}}</p>
    <article class="bj-entry">
      <h3>{{#if title}}{{title}}{{/if}}</h3>
      <div class="bj-meta">
        <p>{{#if subtitle}}{{subtitle}}{{/if}}</p>
        <p>{{#if auxiliary}}{{auxiliary}}{{/if}}</p>
        <p class="bj-dates">{{#if date_range}}{{date_range}}{{/if}}</p>
      </div>
      <div class="bj-body" data-bj-body>
        <div data-bj-rich="detail"></div>
      </div>
    </article>
    <p>{{/work_experiences}}</p>
  </section>

  <section class="bj-section" data-bj-section="projects">
    <h2>项目经历</h2>
    <p>{{#projects}}</p>
    <article class="bj-entry">
      <h3>{{#if title}}{{title}}{{/if}}</h3>
      <div class="bj-meta">
        <p>{{#if subtitle}}{{subtitle}}{{/if}}</p>
        <p>{{#if auxiliary}}{{auxiliary}}{{/if}}</p>
        <p class="bj-dates">{{#if date_range}}{{date_range}}{{/if}}</p>
      </div>
      <div class="bj-body" data-bj-body>
        <div data-bj-rich="detail"></div>
        <div data-bj-rich="secondary_detail"></div>
      </div>
    </article>
    <p>{{/projects}}</p>
  </section>

  <section class="bj-section" data-bj-section="educations">
    <h2>教育经历</h2>
    <p>{{#educations}}</p>
    <article class="bj-entry">
      <h3>{{#if title}}{{title}}{{/if}}</h3>
      <div class="bj-meta">
        <p>{{#if subtitle}}{{subtitle}}{{/if}}</p>
        <p>{{#if auxiliary}}{{auxiliary}}{{/if}}</p>
        <p class="bj-dates">{{#if date_range}}{{date_range}}{{/if}}</p>
      </div>
      <div class="bj-body" data-bj-body>
        <div data-bj-rich="detail"></div>
        <div data-bj-rich="secondary_detail"></div>
      </div>
    </article>
    <p>{{/educations}}</p>
  </section>

  <section class="bj-section" data-bj-section="skills">
    <h2>专业技能</h2>
    <p>{{#skills}}</p>
    <article class="bj-entry">
      <h3>{{name}}</h3>
      <div class="bj-body" data-bj-body>
        <div data-bj-rich="detail"></div>
      </div>
    </article>
    <p>{{/skills}}</p>
  </section>

  <section class="bj-section" data-bj-section="certifications">
    <h2>证书与荣誉</h2>
    <p>{{#certifications}}</p>
    <article class="bj-entry">
      <h3>{{title}}</h3>
      <div class="bj-meta">
        <p>{{#if subtitle}}{{subtitle}}{{/if}}</p>
        <p class="bj-dates">{{#if date_range}}{{date_range}}{{/if}}</p>
      </div>
    </article>
    <p>{{/certifications}}</p>
  </section>
</main>
</body>
</html>
```

## 12. 上传、版本识别与历史模板

- 上传只接受 `.html`、`.htm`，MIME 使用 `text/html`，大小须大于 0 且不超过 8 MB。
- 不接受 `.doc`、`.docx`，也不接受改扩展名的 ZIP／Word 二进制文件。
- 网站、创作者接口和官方模板上传接口使用相同限制。
- 平台保存 V2 模板的版本元数据；作者无需添加 `meta` 版本标签。
- 旧模板已保存的 DOM 与渲染能力保留，不因禁止 Word 上传而删除历史模板。
- Word 导出继续提供；“不支持 Word 上传”不等于“不支持 Word 导出”。

## 13. 校验、预览与审核

### 13.1 作者自检数据

提交前至少检查：

- 无头像、缺少电话或邮箱、只填写部分模块。
- 模块集合为空，或仅有空白条目。
- 公司名、学校名、项目名、邮箱和链接较长。
- 同一模块有多条经历。
- 正文包含多段、编号、列表和强调格式。
- 正文跨页、整份简历超过一页。
- 模块顺序发生改变。
- 日期缺失、完整日期及按平台规则显示“至今”的情况。

### 13.2 V2 校验范围【V2】

- 协议版本受支持，基础字段和条件完整闭合。
- 模块标识完整、唯一、合法，并具备正确的兄弟节点结构。
- 集合与模块匹配，循环作用域正确。
- 富文本插槽字段在当前作用域有效。
- 同一内容没有同时通过文字占位和富文本插槽重复输出。
- 正文分组没有跨条目、跨模块或嵌套冲突。
- 图片来源和占位方式符合资源限制。
- 不存在依赖脚本执行或外部资源加载的必要内容。
- 无法可靠导出的样式给出清晰反馈，不仅显示笼统的“模板无效”。

结构校验不能替代排版检查。复杂内容应继续通过真实预览和导出验证。

### 13.3 预览与导出验收

- 检查实际生成的文件及渲染效果，不能仅以生成成功、XML 合法或自动化测试通过判定合格。
- 检查段落能否正常选择、复制、编辑，特别是跨页正文是否仍连续。
- 检查标题、日期、图片及后续模块是否重叠或缺失。
- 增删 Word 正文后，确认后续内容能够顺移。
- PDF 与 Word 分别检查，不能互相替代。
- 未实际验证的阅读器或版本不得宣称兼容通过。

### 13.4 发布状态

保存草稿只代表源文件处理成功，不代表模板可以发布。现有提交流程会填充示例内容、分页并生成 PDF 预览；当前版本检查与预览通过后，才可进入发布流程。

V2 同时执行模块与插槽结构检查。修改模板后，应重新检查修改后的版本，不能沿用旧版本的审核结果。

## 14. 版本与兼容策略【V2】

- 协议版本记录在模板上传／保存元数据中，不依赖可能在清洗过程中被移除的 HTML `meta` 标签。
- 现有模板保留 V1，不因文档更新就自动按 V2 解释。
- 新模板使用 V2；旧模板迁移时重新检查模块、字段、正文结构和导出效果。
- 不支持 V2 的客户端应明确提示升级或使用受支持版本，不能忽略新插槽导致正文消失。
- 网页预览、APP 渲染、服务端预览和导出应使用一致的协议版本定义。
- 官方提供可下载的 HTML 示例及完整 Markdown 规范。

## 15. 现有模板迁移到 V2 的步骤

1. 备份原模板，保留正在使用的 V1 版本。
2. 为全部标准模块增加正确的模块标识，调整为同一父容器下的独立模块。
3. 移除顶部重复的期望岗位，统一个人信息和求职意向的前缀与间距。
4. 接入 `birth_date_label` 与 `date_range`，移除模板中的日期计算或拼接假设。
5. 将长正文占位转换为对应作用域的富文本插槽，避免重复输出。
6. 为同一条经历的完整正文设置 `data-bj-body`。
7. 清理固定高度、逐行定位、硬编码分页及依赖特殊字体宽度的样式。
8. 使用空数据、长数据、多条目及跨页数据验证预览与导出。
9. 以新协议版本提交检查，确认通过后再替换公开版本。

## 16. 发布前验收清单

- [ ] 文件为 UTF-8 HTML／HTM，大小合规，不依赖外部资源。
- [ ] 八个模块标识完整、唯一，处于同一父容器。
- [ ] 空模块整体隐藏，标题与分隔线不残留。
- [ ] 修改模块顺序后，预览与导出顺序一致。
- [ ] 年龄标签、起止日期与证书日期显示正确。
- [ ] 富文本插槽无重复，编号、换行及强调格式保留。
- [ ] 长正文可以跨页，内容不截断、不重叠。
- [ ] 同一经历的正文仍为连续编辑区域。
- [ ] Word 编辑后后续内容顺移，PDF 可复制正文。
- [ ] 无头像、长名称、多条经历等场景已检查。
- [ ] 检查与预览针对本次上传的同一个模板版本。
