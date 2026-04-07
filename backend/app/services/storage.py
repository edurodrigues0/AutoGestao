import io
import logging
from typing import Tuple

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException
from PIL import Image

from app.config import (
    MINIO_ACCESS_KEY,
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    MINIO_SECRET_KEY,
    MINIO_USE_SSL,
)

logger = logging.getLogger(__name__)

s3_client = boto3.client(
    "s3",
    endpoint_url=f"{'https' if MINIO_USE_SSL else 'http'}://{MINIO_ENDPOINT}",
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)


def ensure_minio_bucket():
    try:
        s3_client.head_bucket(Bucket=MINIO_BUCKET)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=MINIO_BUCKET)
        except ClientError as e:
            err = e.response.get("Error", {}).get("Code", "")
            if err not in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
                raise
    logger.info("MinIO bucket OK: %s", MINIO_BUCKET)


def put_object(path: str, data: bytes, content_type: str) -> dict:
    try:
        s3_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=path,
            Body=data,
            ContentType=content_type,
        )
    except ClientError as e:
        logger.error("put_object failed: %s", e)
        raise HTTPException(500, "Falha ao salvar no armazenamento") from e
    return {"path": path, "size": len(data)}


def get_object_data(path: str):
    try:
        obj = s3_client.get_object(Bucket=MINIO_BUCKET, Key=path)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("NoSuchKey", "404", "NotFound"):
            raise HTTPException(404, "Imagem não encontrada") from e
        logger.error("get_object failed: %s", e)
        raise HTTPException(500, "Falha ao ler arquivo") from e
    body = obj["Body"].read()
    ct = obj.get("ContentType") or "application/octet-stream"
    return body, ct


def _thumbnail_resample():
    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        return Image.LANCZOS


def process_image_to_webp(data: bytes) -> Tuple[bytes, str]:
    """Redimensiona (máx. 1600px) e converte para WebP."""
    try:
        img = Image.open(io.BytesIO(data))
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        if img.mode == "RGBA":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        else:
            img = img.convert("RGB")
    except Exception as e:
        logger.warning("Image decode failed: %s", e)
        raise HTTPException(
            400,
            "Não foi possível processar a imagem. Use JPG, PNG ou WebP.",
        ) from e
    if img.width > 1600 or img.height > 1600:
        img.thumbnail((1600, 1600), _thumbnail_resample())
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=82, method=6)
    out = buf.getvalue()
    return out, "image/webp"


__all__ = [
    "ensure_minio_bucket",
    "put_object",
    "get_object_data",
    "process_image_to_webp",
]
