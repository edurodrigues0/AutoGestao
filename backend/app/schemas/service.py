from typing import Optional

from pydantic import BaseModel


class ServiceCreate(BaseModel):
    client_name: str
    description: Optional[str] = None
    value: float
    photo_path: Optional[str] = None


class ServiceUpdate(BaseModel):
    client_name: Optional[str] = None
    description: Optional[str] = None
    value: Optional[float] = None
    photo_path: Optional[str] = None
