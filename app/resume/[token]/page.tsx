import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import paper from "@/components/resume-guest-review.module.css";
import {
  expectationDetails,
  expectationIcons,
  resumeSections,
} from "@/lib/resume-sections";
import { loadResumeShare, shareTokenPattern } from "@/lib/resume-share-server";
import { DownloadButton } from "./download-button";
import styles from "./share.module.css";

type Props = { params: Promise<{ token: string }> };
type Row = Record<string, unknown>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = shareTokenPattern.test(token)
    ? await loadResumeShare(token)
    : null;
  return {
    title: result?.ok ? heading(result.share) : "简历",
    description: "在线查看并下载这份简历。",
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

const heading = (share: { name: string; title: string }) =>
  share.name ? `${share.name}的简历` : share.title || "简历";

const updatedFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : "";

// "undisclosed" and anything unknown stay hidden, as in the app and the PDF.
const genderLabels: Record<string, string> = {
  male: "男",
  男: "男",
  female: "女",
  女: "女",
};

const labelled = (label: string, value: string) =>
  value ? `${label}: ${value}` : "";

// Name over labelled contact lines with the photo beside them, matching the
// app's preview and the downloaded PDF.
function identity(name: string, personal: Row, photo: string) {
  const birth = text(personal.birth_date);
  const lines = [
    [labelled("电话", text(personal.phone))],
    [labelled("邮箱", text(personal.email))],
    [
      // The server sends "N 岁" when the owner shows an age instead.
      labelled(birth.endsWith("岁") ? "年龄" : "出生日期", birth),
      labelled("性别", genderLabels[text(personal.gender).toLowerCase()] || ""),
    ],
  ]
    .map((line) => line.filter(Boolean))
    .filter((line) => line.length > 0);
  return (
    <div className={styles.identity}>
      <div>
        <p className={styles.name}>{name}</p>
        {lines.map((line) => (
          <p className={styles.details} key={line[0]}>
            {line.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </p>
        ))}
      </div>
      {photo && (
        // The photo redirects to a short-lived signed address.
        <img
          className={styles.photo}
          src={photo}
          alt="简历照片"
          width={84}
          height={112}
        />
      )}
    </div>
  );
}

// Same markup as the review page, minus selection handling, so both read alike.
function field(key: string, value: unknown, iconPath?: string) {
  const shown = text(value);
  if (!shown) return null;
  return (
    <div className={paper.field} key={key}>
      <p>
        {iconPath && (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPath} />
          </svg>
        )}
        {shown}
      </p>
    </div>
  );
}

// Fields the review page hides behind *** sit in the same slot here.
const privateFields: Record<string, string> = {
  work_experiences: "company",
  educations: "institution",
  certifications: "issuer",
};

function entry(
  key: string,
  row: Row,
  fields: readonly string[],
  index: number,
) {
  if (key === "job_expectation") {
    return (
      <div className={paper.entry} key={index}>
        {field("position", row.position)}
        <div className={paper.expectationDetails}>
          {expectationDetails.map((name) =>
            field(name, row[name], expectationIcons[name]),
          )}
        </div>
        {field("preference", row.preference)}
      </div>
    );
  }
  const metaFields: string[] =
    key === "projects"
      ? ["role"]
      : key === "educations"
        ? ["field_of_study", "degree"]
        : key === "work_experiences"
          ? ["position"]
          : [];
  const hasMeta = metaFields.length > 0;
  const hasStart = !!text(row.start_date);
  const hasEnd = !!text(row.end_date);
  const current = key === "work_experiences" && row.current === true && !hasEnd;
  const owner = text(row[privateFields[key]]);
  const url = key === "projects" ? text(row.url) : "";
  return (
    <div className={paper.entry} key={index}>
      {owner && <p className={paper.privateField}>{owner}</p>}
      {key === "projects" && field("name", row.name)}
      {url && /^https?:\/\//i.test(url) && (
        <a
          className={styles.url}
          href={url}
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          {url}
        </a>
      )}
      {hasMeta && (
        <div className={paper.entryMeta}>
          <div className={paper.entryDetails}>
            {metaFields.map((name) => field(name, row[name]))}
          </div>
          <div className={paper.dateRange}>
            {field("start_date", row.start_date)}
            {hasStart && (hasEnd || current) && <span>~</span>}
            {field("end_date", row.end_date)}
            {current && <span>至今</span>}
          </div>
        </div>
      )}
      {fields
        .filter(
          (name) =>
            !(key === "projects" && name === "name") &&
            !(
              hasMeta &&
              (metaFields.includes(name) ||
                name === "start_date" ||
                name === "end_date")
            ),
        )
        .map((name) => field(name, row[name]))}
    </div>
  );
}

function sections(snapshot: Record<string, Row | Row[]>) {
  return resumeSections.map(([key, title, fields]) => {
    const source = snapshot[key];
    if (!source) return null;
    const entries = Array.isArray(source) ? source : [source];
    const shown = entries.filter(
      (row) =>
        fields.some((name) => text(row[name])) ||
        (privateFields[key] && text(row[privateFields[key]])),
    );
    if (!shown.length) return null;
    return (
      <section key={key}>
        <h2>{title}</h2>
        {shown.map((row, index) => entry(key, row, fields, index))}
      </section>
    );
  });
}

export default async function Page({ params }: Props) {
  const { token } = await params;
  if (!shareTokenPattern.test(token)) notFound();
  const result = await loadResumeShare(token);
  const agent = (await headers()).get("user-agent") || "";
  // WeChat and QQ's in-app browsers drop file downloads.
  const inApp = /MicroMessenger|\bQQ\//i.test(agent);
  const base = `/api/v1/public/resume-shares/${token}`;
  let body: ReactNode;
  if (!result.ok) {
    const closed = result.status === 410 || result.status === 404;
    body = (
      <div role="alert" className={paper.error}>
        {closed ? "这份简历的分享链接不存在或已被停用。" : result.message}
      </div>
    );
  } else {
    const { share } = result;
    const personal = (share.snapshot.personal_info || {}) as Row;
    body = (
      <>
        <p className={paper.hint}>
          {inApp
            ? "微信内无法直接下载，请点右上角「···」选择在浏览器打开。"
            : `内容随作者修改同步更新，最近更新于 ${updatedFormat.format(new Date(share.updated_at))}。`}
        </p>
        <article className={paper.paper}>
          {identity(
            text(personal.full_name) || share.title || "简历",
            personal,
            share.has_photo ? `${base}/photo` : "",
          )}
          {sections(share.snapshot as Record<string, Row | Row[]>)}
        </article>
      </>
    );
  }
  return (
    <main id="main" className={paper.page}>
      <header className={paper.header}>
        <a className={`${paper.brand} ${styles.brand}`} href="/">
          Z优简
        </a>
        {result.ok && (
          <DownloadButton
            href={`${base}/pdf`}
            fileName={result.share.file_name}
          />
        )}
      </header>
      {body}
    </main>
  );
}
