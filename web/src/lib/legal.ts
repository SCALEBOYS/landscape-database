// 「このサイトについて」「利用規約」「プライバシー」の本文（日本語・英語）
// 段落は配列の1要素。見出しは h、本文は p、箇条書きは list
import type { Locale } from "./i18n";

export type Block = { h?: string; p?: string; list?: string[] };
export type LegalPage = { title: string; lead: string; updated: string; blocks: Block[] };

const OPERATOR = "Joulis Research & Architecture";
const UPDATED = "2026-10-26";

const ja: Record<"about" | "terms" | "privacy", LegalPage> = {
  about: {
    title: "このサイトについて",
    lead: "Landscape Database は、関西から始めるランドスケープ（公園・広場・街路・外構など）の事例データベースです。用途・要素・樹種・設計・法令・研究から、風景をつくった仕事を横断して探せるようにしています。",
    updated: UPDATED,
    blocks: [
      { h: "運営者", p: OPERATOR },
      { h: "お問い合わせ", p: "掲載内容の訂正・削除の依頼、権利に関するご連絡、調査の依頼などは、お問い合わせフォームからお送りください。内容を確認し、必要に応じて対応します。" },
      { h: "情報の集め方", list: [
        "事例は、受賞一覧・自治体や設計者の公開資料など、出典を確認できる情報をもとに登録しています。各事例のページに出典へのリンクを載せています。",
        "説明文は公開情報を自分たちの言葉で要約したもので、原文の転載はしていません。",
        "竣工年・面積など確認できていない項目は「未登録」と表示し、推測で埋めません。",
        "地図の位置は、現地で確認するまでは概算です。",
        "研究の要約は、公開されている抄録・書誌情報からの下書きで、確認前のものは「確認前の下書き」と表示しています。",
      ] },
      { h: "写真", list: [
        "写真は運営者が現地で撮影したものです（写真がまだない事例は航空写真を代わりに表示しています）。",
        "公開前に人物の写り込みを確認し、位置情報などの撮影データ（EXIF）を消しています。",
        "写真の無断転載・二次利用はお断りしています。利用をご希望の場合はお問い合わせください。",
      ] },
      { h: "設計者・権利者の方へ", p: "掲載内容に誤りや、掲載を望まない情報がある場合は、お問い合わせフォームの「訂正の依頼」または「削除の依頼」からお知らせください。確認のうえ、訂正・削除します。" },
    ],
  },
  terms: {
    title: "利用規約",
    lead: "このサイト（Landscape Database）を利用する方は、次の条件に同意したものとします。",
    updated: UPDATED,
    blocks: [
      { h: "1. 著作権", list: [
        "サイトに掲載している写真・文章・図の著作権は、運営者または正当な権利者に帰属します。",
        "写真の無断転載・二次配布・商用利用を禁止します。文章を引用する場合は、引用の範囲で出典（ページの URL）を明記してください。",
        "出典として紹介している外部の資料・論文の権利は、それぞれの権利者に帰属します。原文は出典先で確認してください。",
      ] },
      { h: "2. 掲載情報について", list: [
        "掲載情報は公開資料などをもとにしていますが、正確さ・完全さ・最新さを保証するものではありません。",
        "法令・制度の説明は要点をまとめたもので、法的な助言ではありません。実際の計画・設計では、原文と所管の窓口で確認してください。",
        "掲載情報を利用したことで生じた損害について、運営者は責任を負いません。",
      ] },
      { h: "3. 禁止事項", list: [
        "サイトや運営のための仕組みに過度な負荷をかける行為（大量の自動取得を含む）",
        "不正アクセス、またはそれを試みる行為",
        "掲載情報を、事実と異なる形で、または誤解を招く形で利用する行為",
        "法令や公序良俗に反する行為",
      ] },
      { h: "4. 変更・停止", p: "運営者は、予告なくサイトの内容やこの規約を変更し、またはサイトの提供を停止することがあります。変更後の規約は、このページに掲載した時点から適用します。" },
      { h: "5. 準拠法", p: "この規約は日本法に従って解釈します。" },
    ],
  },
  privacy: {
    title: "プライバシーポリシー",
    lead: `${OPERATOR}（以下「運営者」）は、このサイトで扱う情報を次のとおり取り扱います。`,
    updated: UPDATED,
    blocks: [
      { h: "1. 取得する情報と使い道", list: [
        "お問い合わせフォームに入力された内容（お名前・メールアドレス・所属・本文など）: お問い合わせへの回答と、掲載内容の訂正・削除などの対応に使います。",
        "アクセスの集計（Vercel Web Analytics）: ページの閲覧数などを匿名で集計し、サイトの改善に使います。Cookie は使わず、個人を特定する情報は集めません。",
        "アクセスの記録（運営者による集計）: 表示されたページ、どのサイトから来たか（サイト名のみ）、国・地域、端末の種類（PC・スマホ・タブレット）を記録し、サイトの改善に使います。Cookie は使わず、IP アドレスは保存しません。同じ日の訪問を数えるため、IP アドレスとブラウザの情報から日ごとに変わる符号を作って記録しますが、そこから個人を特定することはできません。",
        "条件に合う事例がなかった検索の条件（キーワードと絞り込み条件）: 不足している事例を把握するために記録します。IP アドレスなど個人を特定する情報は記録しません。",
        "「最近探したもの」の履歴: お使いのブラウザの中だけに保存し、運営者には送られません。",
      ] },
      { h: "2. 外部のサービス", p: "サイトの運営に次のサービスを利用しています。地図を表示する際などに、お使いの端末からこれらのサービスへ通信が発生します。", list: [
        "Vercel（サイトの配信・アクセスの集計）",
        "Supabase（データベース）",
        "Mapbox（地図・航空写真の表示）",
      ] },
      { h: "3. 第三者への提供", p: "法令に基づく場合を除き、お預かりした個人情報を本人の同意なく第三者に提供しません。" },
      { h: "4. 保存期間", p: "お問い合わせの内容は、対応が終わった後も記録として一定期間保存し、不要になった時点で削除します。" },
      { h: "5. 開示・訂正・削除のご依頼", p: "ご自身の個人情報の開示・訂正・削除をご希望の場合は、お問い合わせフォームからご連絡ください。ご本人であることを確認したうえで対応します。" },
      { h: "6. 改定", p: "この方針は、必要に応じて改定します。改定後の内容は、このページに掲載した時点から適用します。" },
    ],
  },
};

const en: typeof ja = {
  about: {
    title: "About",
    lead: "Landscape Database is a database of landscape architecture projects — parks, plazas, streets and building surroundings — starting in Kansai, Japan. You can browse projects across types, elements, plants, designers, regulations and research.",
    updated: UPDATED,
    blocks: [
      { h: "Operator", p: OPERATOR },
      { h: "Contact", p: "Please use the contact form for corrections, removal requests, rights enquiries and research requests." },
      { h: "How we collect information", list: [
        "Projects are based on verifiable sources such as award lists and public documents from municipalities and designers. Each project page links to its sources.",
        "Descriptions are our own summaries of public information; we do not reprint original texts.",
        "Items we have not confirmed, such as completion year or area, are shown as “Not recorded” rather than estimated.",
        "Map positions are approximate until checked on site.",
        "Research summaries are drafts based on published abstracts and are labelled until reviewed.",
      ] },
      { h: "Photos", list: [
        "Photos are taken on site by the operator (aerial imagery is shown until our own photos are available).",
        "Before publishing we check for identifiable people and remove location data (EXIF).",
        "Do not reproduce or reuse photos without permission. Please contact us if you wish to use them.",
      ] },
      { h: "For designers and rights holders", p: "If anything we publish is wrong or should not be published, please let us know through the contact form. We will check and correct or remove it." },
    ],
  },
  terms: {
    title: "Terms of use",
    lead: "By using Landscape Database you agree to the following terms.",
    updated: UPDATED,
    blocks: [
      { h: "1. Copyright", list: [
        "Copyright in the photos, texts and figures on this site belongs to the operator or the rightful holders.",
        "Reproducing, redistributing or commercially using photos without permission is prohibited. When quoting text, cite the page URL as the source.",
        "Rights in external documents and papers introduced as sources belong to their respective holders.",
      ] },
      { h: "2. Information on this site", list: [
        "Information is based on public sources but we do not guarantee its accuracy, completeness or currency.",
        "Explanations of laws and systems are summaries, not legal advice. Check the original texts and the responsible authorities.",
        "The operator is not liable for any damage arising from the use of this information.",
      ] },
      { h: "3. Prohibited acts", list: [
        "Placing excessive load on the site, including large-scale automated retrieval",
        "Unauthorised access or attempts at it",
        "Using the information in a misleading or false way",
        "Acts contrary to law or public order",
      ] },
      { h: "4. Changes", p: "We may change the site or these terms, or suspend the site, without notice. Changes apply from the time they are posted on this page." },
      { h: "5. Governing law", p: "These terms are governed by the laws of Japan." },
    ],
  },
  privacy: {
    title: "Privacy policy",
    lead: `${OPERATOR} (“the operator”) handles information on this site as follows.`,
    updated: UPDATED,
    blocks: [
      { h: "1. What we collect and why", list: [
        "Contact form entries (name, email, organisation, message): to reply and to handle corrections or removals.",
        "Anonymous visit statistics (Vercel Web Analytics): to improve the site. No cookies and no personally identifying information.",
        "Our own visit records: the page viewed, the referring site (name only), country or region and device type, used to improve the site. No cookies, and IP addresses are not stored. To count visits within a day we store a code derived from the IP address and browser that changes every day and cannot identify you.",
        "Search conditions that returned no projects (keywords and filters): to learn which projects are missing. No IP address or other identifying information is stored.",
        "“Recently viewed” history: stored only in your browser and never sent to us.",
      ] },
      { h: "2. External services", p: "We use the following services; your device communicates with them, for example when maps are shown.", list: [
        "Vercel (hosting and visit statistics)",
        "Supabase (database)",
        "Mapbox (maps and aerial imagery)",
      ] },
      { h: "3. Disclosure to third parties", p: "We do not disclose personal information to third parties without consent, except where required by law." },
      { h: "4. Retention", p: "Enquiries are kept for a period after they are handled and deleted when no longer needed." },
      { h: "5. Access, correction and deletion", p: "To request access to, correction or deletion of your personal information, contact us through the form. We will verify your identity first." },
      { h: "6. Changes", p: "We may revise this policy. Revisions apply from the time they are posted on this page." },
    ],
  },
};

export const legal = (lang: Locale) => (lang === "en" ? en : ja);
