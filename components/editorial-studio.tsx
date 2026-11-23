"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./editorial-studio.module.css";

// Keep the cropped cuff at the edge of the desk while the tip follows the ink.
function drawProofMark(timeline: gsap.core.Timeline, desk: HTMLDivElement) {
  const pencil = desk.querySelector<HTMLElement>("[data-pencil]");
  const ink = desk.querySelector<SVGPathElement>("[data-ink]");
  if (!pencil || !ink) return;
  const matrix = ink.getScreenCTM();
  if (!matrix) return;
  const length = ink.getTotalLength();
  const bounds = pencil.getBoundingClientRect();
  const originY = bounds.top + bounds.height * 0.75;
  const poseAt = (progress: number) => {
    const tip = ink.getPointAtLength(progress * length).matrixTransform(matrix);
    const scale = (bounds.right - tip.x) / (bounds.width * 0.99);
    return { scale, y: tip.y - originY - bounds.height * 0.24 * scale };
  };
  const progress = { value: 0 };
  const scalePencil = gsap.quickSetter(pencil, "scale");
  const liftPencil = gsap.quickSetter(pencil, "y", "px");
  timeline
    .set(pencil, { transformOrigin: "100% 75%" })
    .set(ink, { strokeDashoffset: 1 })
    .to(pencil, { ...poseAt(0), duration: 0.38, ease: "power2.inOut" })
    .to(progress, {
      value: 1,
      duration: 0.54,
      ease: "none",
      onUpdate() {
        const pose = poseAt(progress.value);
        scalePencil(pose.scale);
        liftPencil(pose.y);
        ink.style.strokeDashoffset = String(1 - progress.value);
      },
    })
    .to(pencil, { scale: 1, y: 0, duration: 0.45, ease: "power2.inOut" });
}

const steps = ["原话", "批注", "成稿"] as const;

function PaperCopy({ stage }: { stage: number }) {
  if (stage === 2) {
    return (
      <>
        <p className={styles.finalText}>
          规划校园旧物市集 <strong>24 个摊位</strong>
          的布局，绘制摊位图并分发给摊主，供现场布置使用。
        </p>
        <div className={styles.proofStamp} data-ink>
          已定稿
        </div>
      </>
    );
  }
  return (
    <>
      <p className={styles.quote}>
        我
        <span className={styles.editWord}>
          参与
          {stage === 1 && (
            <svg
              viewBox="0 0 100 58"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                data-ink
                pathLength="1"
                d="M92 13C73 0 12 2 6 23c-9 31 74 40 87 14 9-20-49-35-69-23"
              />
            </svg>
          )}
        </span>
        了学校的旧物市集。
      </p>
      {stage === 0 ? (
        <p className={styles.rawDetail}>
          我给 24 个摊位排了位置，还画了一张摊位图，发给摊主照着布置。
        </p>
      ) : (
        <p className={styles.marginNote}>
          具体负责哪一步？<small>把“排位置”和“画摊位图”写进来。</small>
        </p>
      )}
    </>
  );
}

export default function EditorialStudio() {
  const [stage, setStage] = useState(0);
  const [playback, setPlayback] = useState<"idle" | "playing" | "paused">(
    "idle",
  );
  const playing = playback === "playing";
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const lastStage = useRef(0);
  const stageMotion = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .from("[data-sheet-stack]", { y: 30, rotation: 5, duration: 0.85 }, 0)
          .from(
            "[data-hold]",
            { xPercent: 26, y: -16, rotation: -9, duration: 0.95 },
            0.05,
          )
          .fromTo(
            "[data-underline]",
            { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" },
            0.27,
          );
        gsap.to("[data-float]", {
          y: -26,
          rotation: 2.75,
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.35,
          },
        });
      },
      section,
    );
    return () => media.revert();
  }, []);

  useLayoutEffect(() => {
    if (stage === lastStage.current) return;
    lastStage.current = stage;
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        stageMotion.current = tl;
        if (stage === 1) {
          if (canvas.current) drawProofMark(tl, canvas.current);
        } else {
          tl.from(
            "[data-leaf]",
            {
              rotationY: -26,
              rotation: stage === 2 ? 4 : -3,
              y: 11,
              x: 8,
              duration: 0.54,
              transformOrigin: "5% 75%",
              clearProps: "transform,transformOrigin",
            },
            0,
          ).from(
            "[data-paper-copy]",
            { opacity: 0.4, y: 8, duration: 0.32 },
            0.08,
          );
          if (stage === 2)
            tl.from(
              "[data-ink]",
              {
                scale: 1.65,
                opacity: 0,
                duration: 0.24,
                ease: "back.out(1.8)",
              },
              0.36,
            );
        }
      },
      canvas,
    );
    return () => {
      media.revert();
      stageMotion.current = null;
    };
  }, [stage]);

  useEffect(() => {
    stageMotion.current?.paused(playback === "paused");
  }, [playback]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => {
        if (stage === 1) setPlayback("idle");
        setStage(stage + 1);
      },
      stage === 0 ? 1950 : 2650,
    );
    return () => window.clearTimeout(timer);
  }, [playing, stage]);

  function play() {
    if (playing) {
      setPlayback("paused");
      return;
    }
    if (playback !== "paused") setStage(0);
    setPlayback("playing");
    if (window.matchMedia("(max-width: 760px)").matches) {
      canvas.current?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }

  return (
    <section
      className={styles.intro}
      aria-labelledby="hero-title"
      ref={section}
    >
      <div className={styles.spread}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            <span aria-hidden="true">✳</span> 手机里的简历编辑室
          </p>
          <h1 id="hero-title">
            把做过的事，
            <br />
            写成你的
            <span className={styles.emphasis}>
              简历
              <svg
                viewBox="0 0 170 14"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  data-underline
                  pathLength="1"
                  d="M3 10Q68 1 166 5Q132 6 106 11"
                />
              </svg>
            </span>
            。
          </h1>
          <p className={styles.lead}>
            摊位是你排的，地图也是你画的。把这些细节讲给博简，对照 AI
            的改写，决定哪一句写进简历。
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={play} className={styles.play}>
              <svg aria-hidden="true" viewBox="0 0 20 20">
                {playing ? (
                  <path d="M5 4h4v12H5zm7 0h4v12h-4z" />
                ) : (
                  <path d="m5 3 11 7-11 7z" />
                )}
              </svg>
              {playing
                ? "暂停演示"
                : playback === "paused"
                  ? "继续演示"
                  : stage === 2
                    ? "重播改稿过程"
                    : "播放改稿过程"}
            </button>
            <a href="#features" className={styles.tryLink}>
              动手校一稿
            </a>
          </div>
        </div>
        <div
          className={styles.studio}
          ref={canvas}
          id="studio"
          data-stage={stage}
          aria-label="简历校样示例"
        >
          <div className={styles.table}>
            <div className={styles.grid} aria-hidden="true" />
            <div className={styles.floating} data-float>
              <div className={styles.stack} data-sheet-stack>
                <div className={styles.folder} aria-hidden="true" />
                <div className={styles.backSheet} aria-hidden="true" />
                <div className={styles.front} data-leaf>
                  <div className={styles.paperHeader}>
                    <span>博简校样</span>
                    <span>项目经历</span>
                  </div>
                  <h2>校园旧物市集</h2>
                  <div
                    className={styles.body}
                    data-paper-copy
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <PaperCopy stage={stage} />
                  </div>
                  <div className={styles.paperFoot}>
                    经历改写示例<span aria-hidden="true">✳</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.hand} data-hold aria-hidden="true">
              <div data-pencil>
                <Image
                  src="/brand/editor-hand.webp"
                  alt=""
                  width={880}
                  height={587}
                  sizes="(max-width:760px) 42vw, 270px"
                  preload
                />
              </div>
            </div>
          </div>
          <div className={styles.console}>
            <span className={styles.consoleLabel}>切换校样</span>
            <div
              className={styles.steps}
              role="group"
              aria-label="选择校样阶段"
            >
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={stage === index}
                  onClick={() => {
                    setPlayback("idle");
                    setStage(index);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <noscript>
            <p className={styles.noJs}>
              成稿示例：规划校园旧物市集 24
              个摊位的布局，绘制摊位图并分发给摊主，供现场布置使用。
            </p>
          </noscript>
        </div>
      </div>
    </section>
  );
}
