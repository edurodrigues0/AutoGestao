from typing import Optional

from pydantic import BaseModel


class CheckoutCreate(BaseModel):
    cpf_cnpj: Optional[str] = None
    phone: Optional[str] = None


class PlanUpgrade(BaseModel):
    plan: str
