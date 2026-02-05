const DEFAULT_FAUCET_URL =
  "https://clearnet-sandbox.yellow.com/faucet/requestTokens";

/**
 * Request test tokens from the Yellow Network sandbox faucet.
 * No auth required — just needs a wallet address.
 */
export async function requestFaucet(
  address: string,
  faucetUrl: string = DEFAULT_FAUCET_URL,
): Promise<void> {
  const response = await fetch(faucetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAddress: address }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Faucet request failed (${response.status}): ${text}`);
  }
}
