export default function Home() {
  return (
    <main id="main" className="minimal-home" aria-labelledby="landing-title">
      <div className="brand-stage">
        <p className="brand-eyebrow">简历与求职交流社区</p>
        <h1 id="landing-title" className="brand-title">
          博简
        </h1>
        <p className="brand-statement">把经历，写成新的可能。</p>
        <div className="brand-topics" aria-label="博简的日常">
          <span>记录经历</span>
          <span>打磨简历</span>
          <span>交流经验</span>
        </div>
      </div>
    </main>
  );
}
