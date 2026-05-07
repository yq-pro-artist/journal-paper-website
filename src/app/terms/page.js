export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px", fontFamily: "'DM Sans', sans-serif", color: "#0f0d0a" }}>
      <div style={{ textAlign: "center", marginBottom: 48, borderBottom: "3px double #0f0d0a", paddingBottom: 32 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Joker</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 900, marginBottom: 8 }}>Terms and Conditions</h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#6b6560", letterSpacing: "0.1em" }}>EFFECTIVE MAY 2026</p>
      </div>
      <div style={{ lineHeight: 1.9, fontSize: 15 }}>
        <S title="1. About Joker" zh="关于 Joker">Joker is an independent, open-access scholarly communication platform. Joker serves as an intermediary platform only, providing infrastructure for submission, display, and community review of academic and creative works. Joker does not claim ownership of any content submitted by its users. Joker is not a publisher in the traditional sense. It does not make editorial judgments on the scientific validity of submissions.</S>
        <S title="2. Eligibility" zh="注册资格">You must be at least 18 years of age to create an account. By registering, you represent that all information provided is truthful and accurate. Each individual may maintain only one account. The creation of multiple accounts for any purpose, including manipulating ratings or circumventing bans, is strictly prohibited and will result in immediate and permanent termination of all associated accounts.</S>
        <S title="3. Copyright and Intellectual Property" zh="版权与知识产权">Authors retain full and complete copyright ownership of all works submitted to Joker. At no point does Joker claim ownership, in whole or in part, of any submitted content. By submitting work to Joker, you grant the platform a non-exclusive, worldwide, royalty-free license to display, distribute, and archive your work on the platform. This license does not transfer copyright. You remain free to publish, distribute, or license your work elsewhere at any time. Joker will always display proper attribution (author name, submission date, reference number) alongside all published works. You warrant that your submission does not infringe the intellectual property rights or any other rights of any third party.</S>
        <S title="4. Originality and Academic Integrity" zh="原创性与学术诚信">All submissions must be original works authored by the submitting user. Plagiarism, fabrication of data, falsification of results, and self-plagiarism without disclosure are strictly prohibited. Works found to violate academic integrity standards will be permanently removed. The author's account may be suspended or terminated. In serious cases, Joker reserves the right to notify the author's affiliated institution.</S>
        <S title="5. Community Review and Rating System" zh="社区评审与评分系统">Joker's rating system facilitates constructive, community-driven evaluation. All ratings must be cast in good faith based on a genuine assessment of the work's quality, originality, and contribution. The following are strictly prohibited and may result in account termination: casting ratings based on personal bias against the author rather than the quality of the work; coordinating with others to artificially inflate or deflate scores; creating multiple accounts to cast multiple votes; rating without having read the content; retaliatory rating; and trading ratings. Each user is permitted exactly one vote per submission. Votes are final and cannot be changed. Joker reserves the right to detect and invalidate fraudulent votes.</S>
        <S title="6. Daily Selection" zh="每日评选与收录">Papers submitted each day enter a 24-hour open rating period. The highest-rated submissions may be featured on the platform. Featuring represents community recognition and does not constitute formal peer review or endorsement of scientific accuracy.</S>
        <S title="7. Content Standards" zh="内容规范">Submissions must not contain defamatory, threatening, or harassing content; hate speech or discrimination; content violating any applicable law; personally identifiable information of third parties without consent; advertising or commercial solicitation; or malware. Joker reserves the right to remove any violating content without prior notice.</S>
        <S title="8. Intellectual Property Protection" zh="知识产权保护">Joker implements technical measures to protect submitted works, including watermarked viewing, canvas-based PDF rendering, and download restrictions. While Joker takes reasonable steps to protect content, no digital protection system is absolute. Users who copy, reproduce, or redistribute content without the copyright holder's permission may be subject to legal action.</S>
        <S title="9. Account Security" zh="账户安全">You are solely responsible for maintaining the confidentiality of your account credentials. All activity conducted through your account is your responsibility. Joker is not liable for loss or damage arising from unauthorized access due to your failure to maintain adequate security.</S>
        <S title="10. Disclaimer" zh="免责声明">Joker is provided on an as-is basis without warranties of any kind. The views and opinions expressed in submissions are those of the authors and do not reflect the views of Joker. Joker does not warrant that any content is accurate, complete, or reliable.</S>
        <S title="11. Limitation of Liability" zh="责任限制">Joker shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of the platform, including loss of data, profits, reputation, or academic standing.</S>
        <S title="12. Privacy" zh="隐私保护">Your personal information will not be sold or shared with third parties for marketing purposes. Voting records are stored for integrity purposes but are not publicly associated with your identity.</S>
        <S title="13. Indemnification" zh="赔偿">You agree to indemnify and hold harmless Joker from any claims, damages, or expenses arising from your use of the platform, violation of these terms, or infringement of any third-party rights.</S>
        <S title="14. Termination" zh="终止">Joker may suspend or terminate any account that violates these terms without prior notice. Users may close their account at any time by contacting joker.journalplatform@gmail.com.</S>
        <S title="15. Modifications" zh="条款修改">Joker may modify these terms at any time. Continued use after changes constitutes acceptance.</S>
        <S title="16. Governing Law" zh="适用法律">These terms shall be governed by applicable laws. Disputes shall first be subject to good-faith negotiation.</S>
        <div style={{ marginTop: 48, padding: 32, background: "#0f0d0a", color: "#f5f0e8", textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Joker</div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b6560", lineHeight: 1.8 }}>Open Access · Community Review · Author-Owned Copyright<br/>Questions? <span style={{ color: "#c1121f" }}>joker.journalplatform@gmail.com</span></p>
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}><a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c1121f", letterSpacing: "0.1em" }}>← BACK TO JOKER</a></div>
      </div>
    </div>
  )
}
function S({ title, zh, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{title}</h2>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6b6560", letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" }}>{zh}</div>
      <p style={{ color: "#333" }}>{children}</p>
    </div>
  )
}