"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { gsap } from "gsap";
import styles from "./product-showcase.module.css";

const groups = [
  {
    label: "AI 写作",
    title: "讲清事实，AI 来润色。",
    icon: "M12 3l2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z",
    capabilities: [
      ["AI 生成", "回答问题，生成整份草稿。"],
      ["单段起草", "针对一段经历起草。"],
      ["诊断优化", "逐条对照，决定是否采纳。"],
    ],
  },
  {
    label: "简历管理",
    title: "一段经历，多个投递版本。",
    icon: "M8 3h7l4 4v13H8z M15 3v5h4 M5 6v15 M11 11h5 M11 15h5",
    capabilities: [
      ["导入", "支持 PDF、DOC、DOCX。"],
      ["模块排序", "拖动调整顺序。"],
      ["多版本", "按岗位复制，分别修改。"],
    ],
  },
  {
    label: "模板导出",
    title: "所见即所投。",
    icon: "M3 4h18v16H3z M3 9h18 M10 9v11",
    capabilities: [
      ["模板", "免费、付费与会员模板。"],
      ["打印预览", "彩色、黑白一键切换。"],
      ["导出", "PDF 或 Word，可发到微信。"],
    ],
  },
  {
    label: "简历协作",
    title: "建议落在那一句话上。",
    icon: "M3 4h14v11H8l-4 4v-4H3z M18 9h3v12l-4-3h-5 M7 8h6",
    capabilities: [
      ["链接分享", "免登录批注，随时停用。"],
      ["批注采纳", "采纳与否由你决定。"],
      ["隐私遮盖", "自动隐藏姓名与联系方式。"],
    ],
  },
  {
    label: "发现社区",
    title: "让同行帮你看看。",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Z M15.7 8.3l-2.2 5.2-5.2 2.2 2.2-5.2z",
    capabilities: [
      ["简历分享", "公开简历，收集建议。"],
      ["动态", "记录面试与经验。"],
      ["通知", "批注、回复即时提醒。"],
    ],
  },
  {
    label: "会员服务",
    title: "权益与帮助，一处查看。",
    icon: "M12 3l3 3 4.5.7.7 4.3-2.7 3.3.2 5-5.7-2.2L6.3 19.3l.2-5L3.8 11l.7-4.3L9 6z M9.3 11.4l1.8 1.8 3.7-4",
    capabilities: [
      ["会员", "月卡、年卡与 AI 次数。"],
      ["邀请", "邀请好友得体验包。"],
      ["客服", "自助问答与人工支持。"],
    ],
  },
] as const;

function Glyph({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Without JavaScript the tabs can't switch, so every panel is shown as a list.
const noScriptStyle =
  "<style>[data-feature-tabs]{display:none!important}[data-feature-panel][hidden]{display:flex!important}</style>";

export default function ProductShowcase() {
  const [active, setActive] = useState(0);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const last = useRef(active);

  useLayoutEffect(() => {
    if (last.current === active) return;
    last.current = active;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(panels.current[active], {
        y: 8,
        opacity: 0.73,
        duration: 0.28,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
    });
    return () => media.revert();
  }, [active]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = (
      {
        ArrowRight: (index + 1) % groups.length,
        ArrowDown: (index + 1) % groups.length,
        ArrowLeft: (index + groups.length - 1) % groups.length,
        ArrowUp: (index + groups.length - 1) % groups.length,
        Home: 0,
        End: groups.length - 1,
      } as Record<string, number>
    )[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className={styles.section}
    >
      <noscript dangerouslySetInnerHTML={{ __html: noScriptStyle }} />
      <div className={styles.inner}>
        <h2 id="features-title" className={styles.heading}>
          全部功能
        </h2>
        <div className={styles.workbench}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Z优简功能"
            aria-orientation="vertical"
            data-feature-tabs
          >
            {groups.map((group, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={active === index}
                aria-controls={`feature-panel-${index}`}
                id={`feature-tab-${index}`}
                key={group.label}
                tabIndex={active === index ? 0 : -1}
                ref={(el) => {
                  tabs.current[index] = el;
                }}
                onClick={() => setActive(index)}
                onKeyDown={(e) => navigate(e, index)}
              >
                <span className={styles.index}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {group.label}
                <Glyph path={group.icon} />
              </button>
            ))}
          </div>
          <div className={styles.panels} aria-label="完整功能目录">
            {groups.map((group, index) => (
              <article
                key={group.label}
                id={`feature-panel-${index}`}
                role="tabpanel"
                aria-labelledby={`feature-tab-${index}`}
                tabIndex={0}
                hidden={active !== index}
                data-feature-panel
                ref={(el) => {
                  panels.current[index] = el;
                }}
                className={styles.preview}
              >
                <div className={styles.watermark} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className={styles.panelIcon} aria-hidden="true">
                  <Glyph path={group.icon} />
                </div>
                <h3>{group.title}</h3>
                <dl className={styles.caps}>
                  {group.capabilities.map(([title, description]) => (
                    <div key={title}>
                      <dt>{title}</dt>
                      <dd>{description}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
