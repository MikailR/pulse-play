import { EventEmitter } from "events";
import { authenticate } from "./auth";

// ── Mocks ────────────────────────────────────────────────────────────────

// Mock viem/accounts
const MOCK_SESSION_KEY = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
const MOCK_SESSION_ADDRESS = "0xSessionAddress0000000000000000000000001";

jest.mock("viem/accounts", () => ({
  generatePrivateKey: () => MOCK_SESSION_KEY,
  privateKeyToAccount: (key: string) => ({
    address: key === MOCK_SESSION_KEY ? MOCK_SESSION_ADDRESS : "0xUnknown",
  }),
}));

// Track what SDK functions were called with
const mockCreateAuthRequest = jest.fn().mockResolvedValue("auth_request_msg");
const mockCreateAuthVerify = jest.fn().mockResolvedValue("auth_verify_msg");
const mockCreateEIP712Signer = jest.fn().mockReturnValue("eip712_signer_fn");
const mockCreateECDSASigner = jest.fn().mockReturnValue("session_signer_fn");
const mockParseChallenge = jest.fn().mockReturnValue({
  params: { challengeMessage: "challenge_string_123" },
});
const mockParseVerify = jest.fn();

jest.mock("@erc7824/nitrolite", () => ({
  createAuthRequestMessage: (...args: any[]) => mockCreateAuthRequest(...args),
  createAuthVerifyMessageFromChallenge: (...args: any[]) =>
    mockCreateAuthVerify(...args),
  createEIP712AuthMessageSigner: (...args: any[]) =>
    mockCreateEIP712Signer(...args),
  createECDSAMessageSigner: (...args: any[]) => mockCreateECDSASigner(...args),
  parseAuthChallengeResponse: (...args: any[]) => mockParseChallenge(...args),
  parseAuthVerifyResponse: (...args: any[]) => mockParseVerify(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function createMockWs() {
  const emitter = new EventEmitter();
  const sent: string[] = [];

  return {
    addEventListener: (event: string, handler: (...args: any[]) => void) => {
      emitter.on(event, handler);
    },
    removeEventListener: (event: string, handler: (...args: any[]) => void) => {
      emitter.off(event, handler);
    },
    send: (msg: string) => {
      sent.push(msg);
      // Auto-respond based on what was sent
      if (msg === "auth_request_msg") {
        setTimeout(() => {
          emitter.emit("message", {
            data: JSON.stringify({ res: [1, "auth_challenge", {}] }),
          });
        }, 1);
      } else if (msg === "auth_verify_msg") {
        setTimeout(() => {
          emitter.emit("message", {
            data: JSON.stringify({ res: [2, "auth_verify", {}] }),
          });
        }, 1);
      }
    },
    sent,
    emitter,
  };
}

const MOCK_WALLET_CLIENT = {
  account: { address: "0xMMWallet0000000000000000000000000000001" },
} as any;

// ── Tests ────────────────────────────────────────────────────────────────

describe("authenticate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseVerify.mockReturnValue({ params: { success: true } });
  });

  it("sends auth_request with MM address and session key address", async () => {
    const ws = createMockWs();
    await authenticate(ws as any, MOCK_WALLET_CLIENT);

    expect(mockCreateAuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "0xMMWallet0000000000000000000000000000001",
        session_key: MOCK_SESSION_ADDRESS,
        application: "pulse-play",
      }),
    );
  });

  it("parses auth_challenge response and extracts challenge string", async () => {
    const ws = createMockWs();
    await authenticate(ws as any, MOCK_WALLET_CLIENT);

    expect(mockParseChallenge).toHaveBeenCalled();
    // The verify step uses the challenge string extracted from the challenge response
    expect(mockCreateAuthVerify).toHaveBeenCalledWith(
      "eip712_signer_fn",
      "challenge_string_123",
    );
  });

  it("sends auth_verify with EIP-712-signed challenge", async () => {
    const ws = createMockWs();
    await authenticate(ws as any, MOCK_WALLET_CLIENT);

    expect(mockCreateEIP712Signer).toHaveBeenCalledWith(
      MOCK_WALLET_CLIENT,
      expect.objectContaining({
        scope: "console",
        session_key: MOCK_SESSION_ADDRESS,
      }),
      expect.objectContaining({ name: "pulse-play" }),
    );
    expect(ws.sent).toContain("auth_verify_msg");
  });

  it("returns a MessageSigner function on success", async () => {
    const ws = createMockWs();
    const signer = await authenticate(ws as any, MOCK_WALLET_CLIENT);

    expect(signer).toBe("session_signer_fn");
    expect(mockCreateECDSASigner).toHaveBeenCalledWith(MOCK_SESSION_KEY);
  });

  it("throws on auth_request failure", async () => {
    const ws = createMockWs();
    // Override: respond to auth_request with an error
    ws.send = (msg: string) => {
      ws.sent.push(msg);
      if (msg === "auth_request_msg") {
        setTimeout(() => {
          ws.emitter.emit("message", {
            data: JSON.stringify({ res: [1, "error", { message: "denied" }] }),
          });
        }, 1);
      }
    };

    await expect(authenticate(ws as any, MOCK_WALLET_CLIENT)).rejects.toThrow(
      "RPC error",
    );
  });

  it("throws on auth_verify failure (success=false)", async () => {
    mockParseVerify.mockReturnValue({ params: { success: false } });

    const ws = createMockWs();
    await expect(authenticate(ws as any, MOCK_WALLET_CLIENT)).rejects.toThrow(
      "Authentication failed",
    );
  });
});
