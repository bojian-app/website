"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Phone } from "./phone";
const scenes = [
  {
    label: "简历编辑",
    title: "在手机上编辑简历",
    description: "支持文件导入、分模块编辑，以及 PDF、DOCX 导出。",
    image: "/screens/editor-demo.png",
    alt: "博简 App 简历编辑界面，隐私信息已替换",
  },
  {
    label: "简历求指点",
    title: "发布简历，获取建议",
    description: "附上问题，和社区用户讨论具体修改。",
    image: "/screens/feedback-demo.png",
    alt: "博简 App 简历求指点界面，隐私信息已替换",
  },
  {
    label: "经验交流",
    title: "分享求职和面试经验",
    description: "阅读经验、发表评论，收藏有用的内容。",
    image: "/screens/discovery-demo.png",
    alt: "博简 App 经验交流界面，隐私信息已替换",
  },
];
export function Experience() {
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          ".scene-visual > .phone",
          { rotationY: 32, rotationZ: 4, x: 35, opacity: 0, scale: 0.94 },
          {
            rotationY: 0,
            rotationZ: 0,
            x: 0,
            opacity: 1,
            scale: 1,
            duration: 0.85,
            ease: "power3.out",
            clearProps: "all",
          },
        );
        gsap.from(".scene-copy", {
          y: 12,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          clearProps: "all",
        });
      }, panel);
      return () => context.revert();
    });
    return () => media.revert();
  }, [active]);
  function select(index: number) {
    setActive(index);
  }
  function move(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % scenes.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index + scenes.length - 1) % scenes.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = scenes.length - 1;
    else return;
    event.preventDefault();
    select(next);
    document.getElementById(`scene-tab-${next}`)?.focus();
  }
  const scene = scenes[active];
  return (
    <div className="experience-shell">
      <div
        className="experience-tabs"
        role="tablist"
        aria-label="探索博简功能"
        aria-orientation="horizontal"
      >
        {scenes.map((item, i) => (
          <button
            type="button"
            key={item.label}
            id={`scene-tab-${i}`}
            role="tab"
            aria-controls="scene-panel"
            aria-label={item.label}
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => move(e, i)}
          >
            <span className="scene-tab-number" aria-hidden="true">
              0{i + 1}
            </span>
            <span className="scene-tab-label">{item.label}</span>
            <span className="scene-tab-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <div
        className="experience-panel"
        id="scene-panel"
        role="tabpanel"
        aria-labelledby={`scene-tab-${active}`}
        ref={panel}
        tabIndex={0}
      >
        <div className="scene-copy">
          <span className="scene-label">0{active + 1} / 03</span>
          <h3>
            {scene.title.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h3>
          <p>{scene.description}</p>
        </div>
        <div className="scene-visual">
          <Phone key={scene.image} src={scene.image} alt={scene.alt} />
        </div>
      </div>
    </div>
  );
}
