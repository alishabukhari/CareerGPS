from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.supabase_client import get_supabase_anon

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials

    supabase = get_supabase_anon()

    try:
        res = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not res or not res.user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return {
        "id": res.user.id,
        "email": res.user.email,
    }