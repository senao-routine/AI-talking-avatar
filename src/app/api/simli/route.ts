export async function GET() {
  return Response.json({
    apiKey: process.env.SIMLI_API_KEY || "",
    faceId: process.env.SIMLI_FACE_ID || "",
  });
}
