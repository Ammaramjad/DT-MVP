from botocore.client import Config
import boto3

from research_copilot.core.config import get_settings


class StorageService:
    def __init__(self) -> None:
        settings = get_settings()
        self.bucket = settings.s3_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )

    def upload_bytes(self, key: str, content: bytes, content_type: str = "application/pdf") -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=content, ContentType=content_type)
        return key

    def download_bytes(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()
