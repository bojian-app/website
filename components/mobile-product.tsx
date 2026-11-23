"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import styles from "./mobile-product.module.css";

const screens = [
  {
    file: "ai-interview",
    label: "AI 问答",
    description:
      "回答几个问题，生成简历草稿。",
  },
  {
    file: "work-editor",
    label: "经历编辑",
    description:
      "分栏填写，正文可用 AI 生成。",
  },
  {
    file: "template-benefits",
    label: "模板与权益",
    description:
      "会员模板与 AI 次数一目了然。",
  },
  {
    file: "support-help",
    label: "客服帮助",
    description:
      "按问题找答案，或联系人工。",
  },
] as const;

const screenPath = (file: string) => `/screens/device/${file}.webp`;

/** A resume sheet that rewrites one of its own sentences, then collects a friend's note. */
function Manuscript() {
  return (
    <div className={styles.desk} aria-hidden="true">
      <div className={styles.phone}>
        <Image
          src={screenPath("ai-interview")}
          alt=""
          width={1080}
          height={2376}
          sizes="(max-width: 760px) 34vw, 200px"
          preload
        />
      </div>
      <div className={styles.paper}>
        <div className={styles.paperHead}>
          <div>
            <strong>林一</strong>
            <small>求职意向 · 活动运营实习生</small>
          </div>
          <span className={styles.photo}>***</span>
        </div>
        <h4>项目经历</h4>
        <div className={styles.entry}>
          <b>校园换书会 · 志愿者负责人</b>
          <time>2025.03 ~ 2025.06</time>
        </div>
        <p className={styles.rough}>
          <span>整理了 78 本旧书，做了张分类表，方便同学在换书会上找到想看的书。</span>
        </p>
        <p className={styles.polished}>
          <span>
            为校园换书会登记 78 本图书，<i>编制分类索引</i>，供参与者现场查阅。
          </span>
        </p>
        <span className={styles.bar} style={{ "--w": "92%" } as CSSProperties} />
        <span className={styles.bar} style={{ "--w": "68%" } as CSSProperties} />
        <h4>教育经历</h4>
        <span className={styles.bar} style={{ "--w": "80%" } as CSSProperties} />
        <span className={styles.bar} style={{ "--w": "54%" } as CSSProperties} />
      </div>
      <div className={styles.aiChip}>
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3l2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        AI 改写
      </div>
      <div className={styles.note}>
        <span className={styles.avatar}>岑</span>
        <div>
          <strong>阿岑</strong>
          <p>加个分类例子？</p>
        </div>
      </div>
    </div>
  );
}

export function MobileHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <div className={styles.copy}>
          <h1 id="hero-title">
            每段经历，
            <br />
            都值得<em>好好写下</em>。
          </h1>
          <p className={styles.lead}>
            AI 写，朋友改，一键导出。
          </p>
          <div className={styles.actions}>
            <a href="#features" className={styles.primary}>
              了解功能
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14m-5-5 5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
        <Manuscript />
      </div>
    </section>
  );
}

export function DeviceGallery() {
  const [active, setActive] = useState(1);
  const screen = screens[active];
  return (
    <section
      id="screens"
      className={styles.gallery}
      aria-labelledby="screens-title"
    >
      <h2 id="screens-title" className={styles.galleryHead}>
        实机界面
      </h2>
      <div id="screen-preview" className={styles.fan}>
        {screens.map((item, index) => {
          const offset = index - active;
          return (
            <button
              type="button"
              key={item.file}
              className={styles.fanItem}
              data-offset={Math.max(-2, Math.min(2, offset))}
              style={{ "--offset": offset } as CSSProperties}
              tabIndex={-1}
              aria-hidden={offset !== 0}
              onClick={() => setActive(index)}
            >
              <Image
                src={screenPath(item.file)}
                width={1080}
                height={2376}
                sizes="(max-width: 760px) 52vw, 250px"
                alt={
                  offset === 0 ? `博简 App · ${item.label}完整手机截屏` : ""
                }
                {...(offset === 0 ? { "data-screen-image": "" } : {})}
              />
            </button>
          );
        })}
      </div>
      <div className={styles.galleryControls}>
        <div className={styles.selector} role="group" aria-label="选择实机界面">
          {screens.map(({ label }, i) => (
            <button
              type="button"
              key={label}
              aria-pressed={i === active}
              aria-controls="screen-preview"
              onClick={() => setActive(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <p aria-live="polite" data-screen-description className={styles.details}>
          {screen.description}
        </p>
        <noscript>
          <ul>
            {screens.map((s) => (
              <li key={s.file}>
                <a href={screenPath(s.file)}>{s.label}实机截图</a>
              </li>
            ))}
          </ul>
        </noscript>
      </div>
    </section>
  );
}
