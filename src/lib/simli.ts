const SIMLI_API_KEY = process.env.SIMLI_API_KEY!;
const SIMLI_FACE_ID = process.env.SIMLI_FACE_ID || "default_face_id";

const SIMLI_BASE_URL = "https://api.simli.ai";

export interface SimliSession {
  sessionId: string;
  token: string;
  iceServers: RTCIceServer[];
}

export async function createSimliSession(): Promise<SimliSession> {
  // Get session token
  const tokenRes = await fetch(`${SIMLI_BASE_URL}/compose/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-simli-api-key": SIMLI_API_KEY,
    },
    body: JSON.stringify({
      faceId: SIMLI_FACE_ID,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Simli token error: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();

  // Get ICE servers
  const iceRes = await fetch(`${SIMLI_BASE_URL}/compose/ice`, {
    method: "GET",
    headers: {
      "x-simli-api-key": SIMLI_API_KEY,
    },
  });

  if (!iceRes.ok) {
    throw new Error(`Simli ICE error: ${iceRes.status}`);
  }

  const iceData = await iceRes.json();

  return {
    sessionId: tokenData.sessionId,
    token: tokenData.token,
    iceServers: iceData.iceServers || [],
  };
}

export function getSimliConfig() {
  return {
    apiKey: SIMLI_API_KEY,
    faceId: SIMLI_FACE_ID,
  };
}
