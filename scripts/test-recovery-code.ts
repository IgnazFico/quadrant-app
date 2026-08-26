import { generateRecoveryCode } from "../lib/crypto";

async function main() {
  const code = await generateRecoveryCode();
  console.log("Recovery code:", code);

  const formatRegex = /^([A-F0-9]{4}-){9}[A-F0-9]{4}$/;
  if (!formatRegex.test(code)) {
    console.error("Test failed: code format invalid");
    process.exit(2);
  }
  if (code.length !== 49) {
    console.error("Test failed: unexpected code length", code.length);
    process.exit(3);
  }

  // quick uniqueness sanity check
  const seen = new Set<string>();
  seen.add(code);
  for (let i = 0; i < 4; i++) {
    const c = await generateRecoveryCode();
    seen.add(c);
  }
  if (seen.size !== 5) {
    console.error("Test failed: collision detected in 5 samples");
    process.exit(4);
  }

  console.log("OK — format and uniqueness checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
