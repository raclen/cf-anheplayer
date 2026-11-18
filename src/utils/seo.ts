// SEO 结构化数据构造工具：让 JSON-LD 与页面可见内容保持同源，避免出现“只给爬虫看”的内容。
export interface FaqItem {
  /** 问题 */
  q: string;
  /** 回答 */
  a: string;
}

/** 根据可见区块的问答数据生成 Schema.org FAQPage */
export function buildFaqLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}