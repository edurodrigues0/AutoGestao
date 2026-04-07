from typing import Optional

from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str
    owner_name: str
    email: str
    password: str
    phone: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    plan: str = "basic"


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    commission_type: Optional[str] = None
    commission_percentage: Optional[float] = None
