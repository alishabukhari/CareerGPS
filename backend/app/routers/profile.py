from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.deps import get_current_user
from app.utils.supabase_client import get_supabase_admin

router = APIRouter(prefix="", tags=["profile"])

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    major: str | None = None
    interests: list[str] | None = None

@router.get("/profile")
def get_profile(user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = supabase.table("profiles").select("*").eq("user_id", user["id"]).single().execute()
    if not res.data:
        raise HTTPException(404, "Profile not found")
    return res.data

@router.patch("/profile")
def update_profile(payload: ProfileUpdate, user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = supabase.table("profiles").upsert({
        "user_id": user["id"],
        **payload.model_dump(exclude_unset=True),
    }, on_conflict="user_id").execute()

    return res.data[0]
