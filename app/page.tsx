import { MobileHero, DeviceGallery } from "@/components/mobile-product";
import ProductShowcase from "@/components/product-showcase";
import CommunitySection from "@/components/community-section";
import Journey from "@/components/journey";
import { DownloadButton } from "@/components/download-menu";
import styles from "./home.module.css";

const questions = [
  ["第一次写简历，从哪开始？", "选 AI 问答，回答几个问题即可生成初稿。"],
  ["已有简历能继续改吗？", "能。导入 PDF、DOC 或 DOCX 后继续编辑。"],
  ["朋友能直接改我的简历吗？", "不能。朋友只能批注和建议，采纳由你决定。"],
  ["可以导出什么格式？", "PDF 和 Word。"],
];

export default function Home() {
  return (
    <main id="main" className={styles.home}>
      <MobileHero />
      <Journey />
      <ProductShowcase />
      <DeviceGallery />
      <CommunitySection />
      <section
        className={styles.faq}
        id="questions"
        aria-labelledby="faq-title"
      >
        <h2 id="faq-title" className={styles.faqHead}>
          常见问题
        </h2>
        <div className={styles.answers}>
          {questions.map(([question, answer], index) => (
            <details key={question}>
              <summary>
                <b>{String(index + 1).padStart(2, "0")}</b>
                {question}
                <span aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={styles.ctaInner}>
          <h2 id="cta-title">
            下一份简历，
            <br />
            从一句话开始。
          </h2>
          <DownloadButton className={styles.ctaButton} />
        </div>
      </section>
    </main>
  );
}
