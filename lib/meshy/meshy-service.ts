const MESHY_BASE = "https://api.meshy.ai/openapi/v1";

function getApiKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error("MESHY_API_KEY is not set in .env");
  return key;
}

function headers() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

export interface MeshyResult {
  taskId: string;
  glbUrl: string;
  previewImageUrl: string | null;
}

export async function createImageTo3DTask(imageUrl: string): Promise<string> {
  const res = await fetch(`${MESHY_BASE}/image-to-3d`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ image_url: imageUrl, enable_pbr: true }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meshy create task failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { result: string };
  return data.result;
}

async function getTaskStatus(taskId: string): Promise<{
  status: string;
  model_urls?: { glb?: string };
  thumbnail_url?: string;
  progress?: number;
}> {
  const res = await fetch(`${MESHY_BASE}/image-to-3d/${taskId}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });

  if (!res.ok) {
    throw new Error(`Meshy get task failed ${res.status}`);
  }

  return res.json();
}

export async function waitForTaskCompletion(
  taskId: string,
  onProgress?: (progress: number) => void,
  timeoutMs = 240_000
): Promise<MeshyResult> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const task = await getTaskStatus(taskId);
    const { status } = task;

    if (status === "SUCCEEDED") {
      const glbUrl = task.model_urls?.glb;
      if (!glbUrl) throw new Error(`Meshy task ${taskId} succeeded but no GLB URL`);
      onProgress?.(100);
      return {
        taskId,
        glbUrl,
        previewImageUrl: task.thumbnail_url ?? null,
      };
    }

    if (status === "FAILED" || status === "EXPIRED") {
      throw new Error(`Meshy task ${taskId} ended with status: ${status}`);
    }

    const progress = task.progress ?? 0;
    console.log(`[meshy] task ${taskId} — ${status} ${progress}%`);
    onProgress?.(progress);
    await new Promise((r) => setTimeout(r, 10_000));
  }

  throw new Error(`Meshy task ${taskId} timed out after ${timeoutMs}ms`);
}
