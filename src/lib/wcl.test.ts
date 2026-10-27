const fetchMock = jest.fn();

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

const tokenResponse = () => jsonResponse({ access_token: "token-123", expires_in: 3600 });

// The token cache lives at module level, so load a fresh copy of wcl.ts for each test.
function loadWcl() {
  let mod: typeof import("./wcl") | undefined;
  jest.isolateModules(() => {
    mod = require("./wcl");
  });
  return mod!;
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.WCL_CLIENT_ID = "my-id";
  process.env.WCL_CLIENT_SECRET = "my-secret";
});

describe("wclQuery", () => {
  it("fails with a clear message when credentials are missing", async () => {
    delete process.env.WCL_CLIENT_ID;
    const { wclQuery } = loadWcl();

    await expect(wclQuery("{ x }")).rejects.toThrow("WCL_CLIENT_ID and WCL_CLIENT_SECRET");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gets a token and sends it with the query", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ data: { hello: "world" } }));
    const { wclQuery } = loadWcl();

    const data = await wclQuery<{ hello: string }>("{ hello }");

    expect(data).toEqual({ hello: "world" });
    const [, queryInit] = fetchMock.mock.calls[1];
    expect(queryInit.headers.Authorization).toBe("Bearer token-123");
  });

  it("reuses the token for later queries", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValue(jsonResponse({ data: {} }));
    const { wclQuery } = loadWcl();

    await wclQuery("{ a }");
    await wclQuery("{ b }");

    // One token request plus two queries.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws when the HTTP request fails", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({}, false, 500));
    const { wclQuery } = loadWcl();

    await expect(wclQuery("{ x }")).rejects.toThrow("request failed (500)");
  });

  it("throws the first GraphQL error message", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ errors: [{ message: "Bad field" }] }));
    const { wclQuery } = loadWcl();

    await expect(wclQuery("{ x }")).rejects.toThrow("Bad field");
  });
});
