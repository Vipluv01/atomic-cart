import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const BUCKET = process.env.AWS_S3_BUCKET;

// S3_ENDPOINT + S3_FORCE_PATH_STYLE let this point at an S3-compatible
// server (e.g. MinIO for local dev) instead of real AWS. Unset in
// production, where the SDK falls back to real AWS S3 as normal.
const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(process.env.S3_ENDPOINT
    ? {
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      }
    : {}),
});

/**
 * Returns a presigned PUT URL so the browser can upload a product image
 * directly to S3 (admin upload flow), without routing the file bytes
 * through the Next.js server.
 */
export async function createPresignedUploadUrl(contentType: string) {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET is not set");

  const key = `products/${randomUUID()}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
  const publicUrl = process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`
    : `https://${BUCKET}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl, key };
}
