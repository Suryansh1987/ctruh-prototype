import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing S3 credentials. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in .env"
      );
    }

    _s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _s3;
}

export async function uploadPdfToS3(params: {
  buffer: Buffer;
  storeName: string;
}): Promise<string> {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  if (!bucket || !region) {
    throw new Error("S3_BUCKET_NAME and AWS_REGION must be set in .env");
  }

  const date = new Date().toISOString().split("T")[0];
  const safeName = params.storeName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const key = `xr-reports/${date}/${safeName}-${Date.now()}.pdf`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: "application/pdf",
      Metadata: {
        store: params.storeName,
        generatedAt: new Date().toISOString(),
      },
    })
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
