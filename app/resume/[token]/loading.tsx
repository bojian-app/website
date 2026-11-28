import paper from "@/components/resume-guest-review.module.css";

export default function Loading() {
  return (
    <main id="main" className={paper.page}>
      <header className={paper.header}>
        <span className={paper.brand}>Z优简</span>
      </header>
      <p className={paper.loading}>正在打开简历…</p>
    </main>
  );
}
