# 素材来源与隐私替换

2026-10-20，由用户授权连接 PJD110 Android 手机，通过 ADB 截取博简 App 实际页面。三张官网素材均经过内置 imagegen 编辑，以演示数据替换可识别个人信息；布局和产品功能沿用实机界面。不是未经处理的原始截屏。图中使用示例资料，图片替代文本和示例标注说明其演示性质。

| 文件                                | 实机页面           | 隐私替换                                                                         |
| ----------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `public/screens/editor-demo.png`    | 简历编辑：工作经历 | 公司名称、起止时间替换为示例科技有限公司及演示日期                               |
| `public/screens/discovery-demo.png` | 发现：推荐         | 真实头像换成字母头像，昵称换成简历练习生、职场笔记、博简体验官，地区换成公开分享 |
| `public/screens/feedback-demo.png`  | 发现：简历求指点   | 真实头像、昵称、地区、简历文件名称换成演示数据                                   |

三图统一演示状态栏时间 09:41，移除其他 App 通知图标。没有使用个人资料页、基本信息页、证件、通话页面素材。原始截屏未留在本项目，临时采集目录已清理；旧的本地预览与图片缓存已清理后重新构建。

## 编辑方式与提示词

使用内置 `image_gen.imagegen`（非 CLI）。隐私替换后的图片逐张目视核对。以下为最终提示词规格；原始个人值不写入仓库，以免在提示词记录中重新暴露。

共用提示词：

> Use case: text-localization. Edit target: original Bojian Android App screenshot. Task: privacy-safe marketing screenshot derived from real UI. Sanitize the system status bar: remove notification icons of other apps, display time 09:41 and battery 100%, keeping normal system status icons. Preserve the screenshot's full portrait framing and original aspect ratio 1440:3168, exact placement/size of interface controls, white background, blue brand color, and Chinese UI text typography. This is precise data substitution, not an interface redesign. Do not invent features, phone frame, watermark, extra panels, or decorative elements. Return a clean sharp complete screenshot; all identifying personal names/company/avatar photos must be replaced.

逐图追加要求：

- discovery：every visible personal avatar → neutral blue/lavender geometric monogram avatar, no face/photo；三个昵称依次改为“简历练习生 / 职场笔记 / 博简体验官”；地区信息改为“公开分享”。Preserve post/article body content and functional UI text.
- editor：company name → “示例科技有限公司”；start/end date → “2023-07 / 2024-04”。Preserve job “前端开发工程师” and other UI labels/layout. No other personal information should appear.
- feedback：two photo avatars → geometric monogram avatars；nicknames → “简历练习生 / 博简体验官”；地区 → “公开分享”；second resume title → “前端开发工程师 · 示例简历”。Preserve all functional UI labels and post body text.

`public/brand/app-icon.png` 来自博简移动项目的品牌源素材。图标不含个人数据。手机边框、示例简历纸、连接线与文件插图由 HTML/CSS/SVG 实现，没有使用第三方照片或虚构产品功能。


## 历史白色建筑背景（2026-10-21，已移出页面）

用户要求搜索现成的浅色背景图片，替换自绘球体与拼音。该历史版本选用 Pawel Czerwinski 的 Abstract white curved architectural background：

- 作品页：https://unsplash.com/photos/abstract-white-curved-architectural-background-C6rZgXbNxJk
- 图片：https://images.unsplash.com/photo-1767170476039-e2bc8916684a?auto=format&fit=crop&w=1920&q=85
- 历史公开路径：`public/backgrounds/white-architecture.jpg`；已移出 public，归档至 `artifacts/design-backup/white-architecture.jpg`。
- 原站明确标记 Free to use under the Unsplash License，许可：https://unsplash.com/license 。

图片按原始下载结果存储，无生成或重绘；页面以白色为底降低其显示透明度。候选雪景与白色建筑摄影仅保存在 `artifacts/background-candidates/`，不作为当前页面背景。

用户随后要求移除该图片。当前首页与登录页均不再引用或预加载它，使用 HTML 文字和 CSS 表面完成设计；本条仅保留素材来源记录。
