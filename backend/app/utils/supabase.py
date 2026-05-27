from supabase import create_client, Client
from ..config import settings


def _base_url() -> str:
    return settings.SUPABASE_URL.split("/rest/v1")[0].rstrip("/")


def get_supabase() -> Client:
    return create_client(_base_url(), settings.SUPABASE_KEY)


def get_bucket() -> str:
    return settings.SUPABASE_BUCKET


def _clean_path(value: str) -> str:
    """Extract raw storage path, stripping any stored URL prefix from old records."""
    bucket = get_bucket()
    for marker in (f"/object/public/{bucket}/", f"object/public/{bucket}/"):
        if marker in value:
            return value.split(marker, 1)[1]
    return value


def attach_signed_url(obj, field: str, **_) -> None:
    raw = getattr(obj, field, None)
    if raw:
        path = _clean_path(raw)
        setattr(obj, field, f"{_base_url()}/storage/v1/object/public/{get_bucket()}/{path}")
