import styles from "./community-section.module.css";

const notes = [
  {
    who: "阿岑",
    kind: "批注",
    text: "卡在哪一步？写出来。",
    place: "a",
  },
  {
    who: "周周",
    kind: "改写",
    text: "定位流失环节，调整引导顺序。",
    place: "b",
  },
  {
    who: "Mia",
    kind: "批注",
    text: "“优化”太空，前后有何不同？",
    place: "c",
  },
  {
    who: "小林",
    kind: "回复",
    text: "好，我补上。",
    place: "d",
  },
] as const;

export default function CommunitySection() {
  return (
    <section
      id="community"
      className={styles.section}
      aria-labelledby="community-heading"
    >
      <div className={styles.inner}>
        <h2 id="community-heading" className={styles.heading}>
          让同行读一遍。
        </h2>

        <figure className={styles.wall}>
          <figcaption className={styles.caption}>社区互动示例</figcaption>
          <svg
            className={styles.threads}
            viewBox="0 0 1000 560"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M330 250 C 260 230, 230 150, 190 120" />
            <path d="M670 240 C 740 220, 770 140, 810 110" />
            <path d="M360 330 C 290 360, 250 420, 200 450" />
            <path d="M650 340 C 720 380, 760 430, 810 460" />
          </svg>
          <div className={styles.post}>
            <div className={styles.author}>
              <span aria-hidden="true">林</span>
              <div>
                <strong>小林</strong>
                <small>产品运营</small>
              </div>
            </div>
            <p className={styles.ask}>能看出我做了什么吗？</p>
            <blockquote>
              <mark>负责新用户引导流程优化</mark>。
            </blockquote>
          </div>
          <ul className={styles.notes}>
            {notes.map((note) => (
              <li key={note.who} data-place={note.place}>
                <strong>
                  {note.who}
                  <small>{note.kind}</small>
                </strong>
                <p>{note.text}</p>
              </li>
            ))}
          </ul>
        </figure>

      </div>
    </section>
  );
}
