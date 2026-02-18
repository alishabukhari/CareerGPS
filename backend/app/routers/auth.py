from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.utils.supabase_client import get_supabase_admin, get_supabase_anon
from app.auth.deps import get_current_user
from supabase_auth.errors import AuthApiError

router = APIRouter(prefix="", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(payload: SignupRequest):
    supabase = get_supabase_admin()

    try:
        res = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
        })

        if not res.session:
            # This happens if email confirmation is enabled in Supabase
            return {
                "message": "Signup successful. Please verify your email.",
            }

        return {
            "access_token": res.session.access_token,   # ✅ REQUIRED for frontend auth
            "user": {
                "id": res.user.id,
                "email": res.user.email,
            },
        }

    except AuthApiError as e:
        msg = str(e).lower()
        if "already registered" in msg or "user already exists" in msg:
            raise HTTPException(
                status_code=400,
                detail="This email is already registered. Please log in instead."
            )
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(data: LoginRequest):
    supabase = get_supabase_anon()  # ✅ MUST be anon

    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not res.user or not res.session:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "access_token": res.session.access_token,   # ✅ REQUIRED
        "user": {
            "id": res.user.id,
            "email": res.user.email,
        },
    }


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user