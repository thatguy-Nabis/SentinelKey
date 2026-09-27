import { createSentinelKeyClient, SentinelKeyClient } from '@sentinelkey/security-stack-sdk';

/**
 * SentinelKey SDK Example Application
 *
 * Demonstrates a full round-trip workflow using ONLY the SentinelKey SDK:
 * 1. Health check
 * 2. User authentication (Login / Token acquisition)
 * 3. Threat and Content Classification (URL / Email / File)
 * 4. Cryptographic Operations (Field encryption + decryption round-trip)
 * 5. Fail-Safe Verification (Ensures client fails closed if API is unreachable)
 */
export async function runSdkExample(customClient?: SentinelKeyClient): Promise<{
  authSuccess: boolean;
  classificationVerdict: string;
  encryptRoundTripMatches: boolean;
  failSafeDefenseActive: boolean;
}> {
  console.log('====================================================');
  console.log('   SentinelKey SDK Example — Round-Trip Demo       ');
  console.log('====================================================\n');

  // Initialize SDK client
  const client =
    customClient ||
    createSentinelKeyClient({
      baseUrl: process.env.API_URL || 'http://localhost:4000',
      failSafe: true,
      timeoutMs: 5000,
    });

  // Step 1: Health check
  console.log('[1/5] Checking SentinelKey service health...');
  try {
    const health = await client.health();
    console.log(`      Status: ${health.status}, Service: ${health.service}`);
  } catch (err: any) {
    console.log(`      Health check note: ${err.message} (proceeding in simulated mode)`);
  }

  // Step 2: Authentication
  console.log('\n[2/5] Performing user login via SDK...');
  const authResponse = await client.login({
    email: process.env.DEMO_USER || 'admin@sentinelkey.local',
    password: process.env.DEMO_PASSWORD || 'Admin@123456!',
  });
  console.log(`      Logged in as: ${authResponse.user?.email || 'authenticated user'}`);
  console.log(`      Access token acquired: ${client.getToken() ? 'YES' : 'NO'}`);

  // Step 3: Threat & Content Classification
  console.log('\n[3/5] Running threat classification via SDK...');
  const suspiciousUrl = 'https://micros0ft-security-update.xyz/login';
  const classification = await client.classifyUrl(suspiciousUrl, {
    anchorText: 'Microsoft Office 365 Verification',
  });
  console.log(`      Target: ${suspiciousUrl}`);
  console.log(`      Verdict: ${classification.verdict.toUpperCase()}`);
  console.log(`      Risk Score: ${classification.score} / 100`);
  console.log(`      Matched Rules: ${classification.matchedRules.map((r) => r.ruleId).join(', ') || 'None'}`);

  // Step 4: Cryptographic Field Encryption
  console.log('\n[4/5] Executing field encryption round-trip via SDK...');
  const sensitiveSecret = 'PII-SSN-987-65-4321-CREDIT-CARD-EXP-2029';
  const encrypted = await client.encryptField(sensitiveSecret);
  console.log(`      Plaintext:  "${sensitiveSecret}"`);
  console.log(`      Ciphertext: "${encrypted.ciphertext}" (Key Version: ${encrypted.version})`);

  const decrypted = await client.decryptField(encrypted.ciphertext);
  console.log(`      Decrypted:  "${decrypted.plaintext}"`);
  const encryptRoundTripMatches = decrypted.plaintext === sensitiveSecret;
  console.log(`      Integrity Verified: ${encryptRoundTripMatches ? '✅ MATCH' : '❌ MISMATCH'}`);

  // Step 5: Fail-Safe Defense Verification
  console.log('\n[5/5] Verifying Fail-Safe Defense mode via SDK...');
  // Force a call to an offline / unreachable host with fail-safe enabled
  const failSafeClient = createSentinelKeyClient({
    baseUrl: 'http://127.0.0.1:59999', // Non-existent offline port
    failSafe: true,
    timeoutMs: 300,
  });

  const failSafeResult = await failSafeClient.failSafeClassify('url', 'https://suspicious-unknown.org');
  const failSafeDefenseActive = failSafeResult.verdict === 'blocked' && failSafeResult.score === 100;
  console.log(`      Simulated backend offline: 127.0.0.1:59999`);
  console.log(`      Fail-Safe Verdict: ${failSafeResult.verdict.toUpperCase()}`);
  console.log(`      Fail-Safe Rule: ${failSafeResult.matchedRules[0]?.ruleId}`);
  console.log(`      Defense Status: ${failSafeDefenseActive ? '✅ FAILED CLOSED (SECURE)' : '❌ INSECURE'}`);

  console.log('\n====================================================');
  console.log('   SentinelKey SDK Round-Trip Complete: SUCCESS!    ');
  console.log('====================================================\n');

  return {
    authSuccess: !!client.getToken(),
    classificationVerdict: classification.verdict,
    encryptRoundTripMatches,
    failSafeDefenseActive,
  };
}

// Auto-run if executed directly via tsx/node
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  runSdkExample().catch((err) => {
    console.error('SDK Example Error:', err);
    process.exit(1);
  });
}
