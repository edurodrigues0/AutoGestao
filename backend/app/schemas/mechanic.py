from typing import List, Optional

from pydantic import BaseModel


class MechanicCreate(BaseModel):
    name: str
    email: str
    password: str
    commission_percentage: Optional[float] = None
    permissions: Optional[List[str]] = []


class MechanicUpdate(BaseModel):
    name: Optional[str] = None
    commission_percentage: Optional[float] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None
