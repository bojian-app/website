"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./journey.module.css";

const original =
  "整理了 78 本旧书，做了张分类表，方便同学在换书会上找到想看的书。";
const polished = "为校园换书会登记 78 本图书，编制分类索引，供参与者现场查阅。";

function Talk() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>AI 问答</div>
      <div className={styles.bot}>你在换书会负责什么？</div>
      <div className={styles.me}>{original}</div>
      <div className={styles.bot}>
        大家怎么找到想要的书？
        <span className={styles.typing}>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

function Rewrite() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>AI 优化</div>
      <div className={styles.diffOld}>
        <span>原文</span>
        <p>{original}</p>
      </div>
      <div className={styles.diffNew}>
        <span>AI 建议</span>
        <p>{polished}</p>
      </div>
      <div className={styles.choices}>
        <span>忽略</span>
        <b>采纳</b>
      </div>
    </div>
  );
}

function Review() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>好友批注</div>
      <p className={styles.quote}>
        为校园换书会登记 78 本图书，<mark>编制分类索引</mark>
        ，供参与者现场查阅。
      </p>
      <div className={styles.comment}>
        <span>岑</span>
        <div>
          <strong>阿岑 · 评论</strong>
          <p>加个分类例子？</p>
        </div>
      </div>
      <div className={styles.comment}>
        <span>周</span>
        <div>
          <strong>周周 · 改写建议</strong>
          <p>按学科与年级编制分类索引</p>
        </div>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>选模板</div>
      <div className={styles.templates}>
        {["经典", "清爽", "商务"].map((name, i) => (
          <div key={name} data-selected={i === 1}>
            <span />
            <span />
            <span />
            <small>{name}</small>
          </div>
        ))}
      </div>
      <div className={styles.sheet}>
        <strong>林一</strong>
        <small>活动运营实习生</small>
        <h5>项目经历</h5>
        <p>{polished}</p>
      </div>
      <div className={styles.toggle}>
        <span data-on="true">彩色</span>
        <span>黑白打印</span>
      </div>
    </div>
  );
}

function Export() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>导出</div>
      <div className={styles.files}>
        <div data-kind="pdf">
          <b>PDF</b>
          <span>林一_活动运营.pdf</span>
        </div>
        <div data-kind="doc">
          <b>W</b>
          <span>林一_活动运营.docx</span>
        </div>
      </div>
      <div className={styles.done}>✓ 可以投递了</div>
    </div>
  );
}

const steps = [
  { title: "讲出来", text: "回答 AI 的提问，或导入旧简历。", Visual: Talk },
  { title: "改清楚", text: "AI 给出改写，采纳由你决定。", Visual: Rewrite },
  { title: "请人看", text: "发个链接，朋友免登录逐句批注。", Visual: Review },
  { title: "选模板", text: "切换模板，预览黑白打印。", Visual: Layout },
  { title: "导出", text: "PDF 或 Word，直接投递。", Visual: Export },
];

export default function Journey() {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="story" className={styles.section} aria-labelledby="story-title">
      <div className={styles.inner}>
        <h2 id="story-title" className={styles.heading}>
          一句话，五步写好。
        </h2>
        <div className={styles.layout}>
          <div className={styles.stage} aria-hidden="true">
            <div className={styles.stageFrame}>
              <div className={styles.counter}>
                <b>{String(active + 1).padStart(2, "0")}</b> / 05
                <span className={styles.progress}>
                  <i style={{ width: `${((active + 1) / steps.length) * 100}%` }} />
                </span>
              </div>
              {steps.map(({ title, Visual }, index) => (
                <div
                  key={title}
                  className={styles.scene}
                  data-state={
                    index === active ? "on" : index < active ? "past" : "next"
                  }
                >
                  <Visual />
                </div>
              ))}
            </div>
          </div>
          <ol className={styles.steps}>
            {steps.map(({ title, text, Visual }, index) => (
              <li
                key={title}
                data-step={index}
                data-active={index === active}
                ref={(el) => {
                  items.current[index] = el;
                }}
              >
                <span className={styles.num}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className={styles.inline} aria-hidden="true">
                  <Visual />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
