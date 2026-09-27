import { getActivePolicy, evaluateVerdict, recordAndAlert } from './rules-engine.js';
import type {
  IClassificationResult,
  IMatchedRule,
  IEmailPayload,
} from '@sentinelkey/shared-types';

export class EmailClassifierService {
  /**
   * Calculate standard Levenshtein edit distance between two strings
   */
  public levenshteinDistance(a: string, b: string): number {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    const m = s1.length;
    const n = s2.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Extract domain from email address (e.g. 'alice@example.com' -> 'example.com')
   */
  public extractEmailDomain(email: string): string {
    const match = email.match(/@([^@\s>]+)/);
    return match ? match[1].toLowerCase().trim() : '';
  }

  /**
   * Extract hostname from a URL
   */
  public extractHostname(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.toLowerCase();
    } catch {
      // If missing scheme, attempt prefix
      try {
        const parsed = new URL('http://' + urlStr);
        return parsed.hostname.toLowerCase();
      } catch {
        return '';
      }
    }
  }

  /**
   * Classify inbound email message against phishing and compliance policies
   */
  public async classifyEmail(params: {
    email: IEmailPayload;
    ip?: string;
    userId?: string;
    policyVersion?: number;
  }): Promise<IClassificationResult> {
    const { email, ip = '127.0.0.1', userId, policyVersion } = params;

    const policy = await getActivePolicy('email', policyVersion);
    const version = policy ? policy.version : 1;
    const policyId = policy ? policy._id.toString() : undefined;
    const thresholds = policy ? policy.thresholds : { flag: 30, quarantine: 60, block: 80 };
    const rules = policy ? policy.rules : [];

    const matchedRules: IMatchedRule[] = [];
    let totalScore = 0;

    const isRuleActive = (ruleId: string) => {
      const r = rules.find(x => x.id === ruleId);
      return r ? r.enabled : true;
    };

    const getRuleScore = (ruleId: string, defaultScore: number) => {
      const r = rules.find(x => x.id === ruleId);
      return r ? r.score : defaultScore;
    };

    const fromDomain = this.extractEmailDomain(email.from);
    const replyTo = email.replyTo || email.headers?.['reply-to'] || email.headers?.['Reply-To'];
    const replyToDomain = replyTo ? this.extractEmailDomain(replyTo) : '';
    const subject = email.subject || '';
    const bodyText = email.bodyText || '';
    const bodyHtml = email.bodyHtml || '';
    const combinedContent = `${subject} ${bodyText} ${bodyHtml}`.toLowerCase();

    // --- RULE EML-001: Lookalike Typosquatting Domain ---
    if (isRuleActive('EML-001') && fromDomain) {
      const ruleDef = rules.find(x => x.id === 'EML-001');
      const defaultProtected = [
        'sentinelkey.com',
        'sentinelkey.local',
        'microsoft.com',
        'google.com',
        'paypal.com',
        'bankofamerica.com',
      ];
      const protectedDomains: string[] = (ruleDef?.params?.protectedDomains as string[]) || defaultProtected;
      const maxDistance: number = (ruleDef?.params?.maxEditDistance as number) || 2;

      for (const legit of protectedDomains) {
        // Exclude exact match (not a lookalike)
        if (fromDomain === legit.toLowerCase()) continue;

        const dist = this.levenshteinDistance(fromDomain, legit);
        if (dist > 0 && dist <= maxDistance) {
          const score = getRuleScore('EML-001', 75);
          totalScore += score;
          matchedRules.push({
            ruleId: 'EML-001',
            name: 'Lookalike Typosquatting Domain',
            score,
            description: `Sender domain "${fromDomain}" is suspiciously similar to protected domain "${legit}" (edit distance: ${dist})`,
            details: { senderDomain: fromDomain, targetDomain: legit, distance: dist },
          });
          break;
        }
      }
    }

    // --- RULE EML-002: Display Text vs Href Link Mismatch ---
    if (isRuleActive('EML-002') && bodyHtml) {
      // Regex to find all <a href="...">...</a>
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(bodyHtml)) !== null) {
        const href = match[1].trim();
        const displayText = match[2].replace(/<[^>]+>/g, '').trim(); // Strip nested HTML

        const hrefHost = this.extractHostname(href);

        // Check if display text contains a domain or URL that contradicts hrefHost
        const displayDomainMatch = displayText.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
        if (displayDomainMatch && hrefHost) {
          const displayedDomain = displayDomainMatch[1].toLowerCase();
          if (!hrefHost.endsWith(displayedDomain) && !displayedDomain.endsWith(hrefHost)) {
            const score = getRuleScore('EML-002', 80);
            totalScore += score;
            matchedRules.push({
              ruleId: 'EML-002',
              name: 'Display Text vs Href Link Mismatch',
              score,
              description: `Deceptive link: text displays "${displayedDomain}" but destination URL points to "${hrefHost}"`,
              details: { displayedDomain, hrefHost, href },
            });
            break;
          }
        }
      }
    }

    // --- RULE EML-003: Suspicious TLD or URL Shortener ---
    if (isRuleActive('EML-003')) {
      const ruleDef = rules.find(x => x.id === 'EML-003');
      const defaultTlds = ['.top', '.xyz', '.click', '.buzz', '.cc', '.ru', '.tk', '.fit'];
      const defaultShorteners = ['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'ow.ly', 'buff.ly'];

      const suspiciousTlds: string[] = (ruleDef?.params?.suspiciousTlds as string[]) || defaultTlds;
      const shorteners: string[] = (ruleDef?.params?.shorteners as string[]) || defaultShorteners;

      // Extract all URLs from text and HTML to inspect their exact hostnames
      const rawUrls = (bodyText + ' ' + bodyHtml).match(/(?:https?:\/\/|www\.)[^\s"'<>]+/gi) || [];
      const hosts = rawUrls.map(u => this.extractHostname(u));

      // Shorteners can appear with or without protocol (e.g. bit.ly/abc or https://bit.ly/abc)
      const foundShortener = shorteners.find(
        s => combinedContent.includes(s + '/') || hosts.some(h => h === s || h.endsWith('.' + s))
      );
      const foundTld = suspiciousTlds.find(tld => hosts.some(h => h.endsWith(tld)));

      if (foundShortener || foundTld) {
        const score = getRuleScore('EML-003', 50);
        totalScore += score;
        matchedRules.push({
          ruleId: 'EML-003',
          name: 'Suspicious TLD or URL Shortener',
          score,
          description: `Message contains masked links or high-risk domain TLDs (${foundShortener || foundTld})`,
          details: { detected: foundShortener || foundTld },
        });
      }
    }

    // --- RULE EML-004: Phishing Urgency Keywords ---
    if (isRuleActive('EML-004')) {
      const ruleDef = rules.find(x => x.id === 'EML-004');
      const defaultKeywords = [
        'urgent wire transfer',
        'verify your account immediately',
        'password expired reset now',
        'suspend your account',
        'unauthorized transaction detected',
        'action required within 24 hours',
        'security alert confirm password',
      ];
      const keywords: string[] = (ruleDef?.params?.keywords as string[]) || defaultKeywords;

      const matchedKeyword = keywords.find(kw => combinedContent.includes(kw.toLowerCase()));
      if (matchedKeyword) {
        const score = getRuleScore('EML-004', 40);
        totalScore += score;
        matchedRules.push({
          ruleId: 'EML-004',
          name: 'Phishing Urgency Keywords',
          score,
          description: `Message body contains high-urgency phishing trigger phrase: "${matchedKeyword}"`,
          details: { matchedKeyword },
        });
      }
    }

    // --- RULE EML-005: Sender Reply-To Spoofing Mismatch ---
    if (isRuleActive('EML-005') && fromDomain && replyToDomain) {
      if (fromDomain !== replyToDomain) {
        // High risk if From looks like an organization but Reply-To is freemail
        const freeMails = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'mail.ru'];
        const isFreeMailReply = freeMails.includes(replyToDomain);

        const score = getRuleScore('EML-005', 70);
        totalScore += score;
        matchedRules.push({
          ruleId: 'EML-005',
          name: 'Sender Reply-To Spoofing Mismatch',
          score,
          description: `Sender From domain "${fromDomain}" does not match Reply-To domain "${replyToDomain}"${
            isFreeMailReply ? ' (Reply-To uses public freemail provider)' : ''
          }`,
          details: { fromDomain, replyToDomain },
        });
      }
    }

    const { verdict, severity } = evaluateVerdict(totalScore, thresholds);
    const subjectId = `email-${fromDomain}-${Date.now()}`;

    const result: IClassificationResult = {
      subjectType: 'email',
      subjectId,
      verdict,
      severity,
      score: totalScore,
      matchedRules,
      policyVersion: version,
      policyId,
      timestamp: new Date(),
      metadata: {
        from: email.from,
        subject: email.subject,
        fromDomain,
        replyToDomain,
      },
    };

    // Audit log & trigger IDS alert if not safe
    await recordAndAlert(result, { ip, userId });

    return result;
  }
}

export const emailClassifierService = new EmailClassifierService();
