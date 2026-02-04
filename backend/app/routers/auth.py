from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.supabase_client import get_supabase_admin, get_supabase_anon

router = APIRouter(prefix="", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(data: LoginRequest):
    supabase = get_supabase_anon()  # ✅ anon

    res = supabase.auth.sign_in_with_password({
        "email": data.email,
        "password": data.password,
    })

    if not res.user or not res.session:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "access_token": res.session.access_token,
        "user": {
            "id": res.user.id,
            "email": res.user.email,
        },
    }
