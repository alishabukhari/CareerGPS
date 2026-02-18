from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.auth.deps import get_current_user
from app.utils.supabase_client import get_supabase_admin
from pydantic import BaseModel
from datetime import datetime
from typing import List, Literal, AsyncGenerator, Optional
import asyncio
import json
import os
from openai import OpenAI
from postgrest.exceptions import APIError


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

print("OPENAI_API_KEY loaded:", bool(os.getenv("OPENAI_API_KEY")))

class CompleteTaskRequest(BaseModel):
    title: str

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

class ChatMsg(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class TopicChatRequest(BaseModel):
    topic_title: Optional[str] = None
    topic_slug: Optional[str] = None
    session_id: Optional[str] = None
    messages: List[ChatMsg]
    mode: Optional[str] = None

class CreateChatSessionRequest(BaseModel):
    topic_title: str
    preview_title: Optional[str] = None  

class RenameChatSessionRequest(BaseModel):
    title: str      

class InitRoadmapRequest(BaseModel):
    target_role: str

# ======================
# Helpers
# ======================

def generate_ai_roadmap_for_role(role: str) -> dict:
    prompt = f"""
Create a structured learning roadmap for a {role}.
Return ONLY valid JSON in this format:

{{
  "target_role": "{role}",
  "phases": [
    {{
      "phase": "Phase 1: ...",
      "description": "...",
      "items": [
        {{
          "title": "...",
          "type": "course|project|reading",
          "estimated_weeks": 2,
          "why": "..."
        }}
      ]
    }}
  ]
}}
"""

    res = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
    )

    content = res.choices[0].message.content.strip()
    start = content.find("{")
    end = content.rfind("}") + 1
    return json.loads(content[start:end])

from postgrest.exceptions import APIError

def _get_saved_roadmap(user_id: str, supabase):
    try:
        return (
            supabase.table("user_roadmap")
            .select("roadmap_json, target_role")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
    except APIError as e:
        if "JWT expired" in str(e):
            raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
        raise

def generate_ai_explanation(title: str):
    try:
        prompt = f"""
Explain the topic '{title}' to a beginner frontend developer.
Return ONLY valid JSON in this exact format (no extra text, no markdown):

{{
  "explanation": "short beginner-friendly explanation",
  "checklist": ["task 1", "task 2", "task 3"]
}}
"""

        res = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )

        content = res.choices[0].message.content.strip()

        start = content.find("{")
        end = content.rfind("}") + 1
        json_str = content[start:end]

        data = json.loads(json_str)

        return data["explanation"], data["checklist"]

    except Exception as e:
        print("❌ OpenAI error:", e)
        return (
            f"This topic teaches core concepts of {title}. Practice by building small examples.",
            [
                f"Read docs on {title}",
                f"Build a small demo using {title}",
                f"Write notes on {title}",
            ],
        )
    

# ======================
# Routes
# ======================

@router.get("")
def get_roadmap(current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    saved = _get_saved_roadmap(user_id, supabase)

    if not saved.data:
        raise HTTPException(status_code=404, detail="No roadmap found for this user")

    roadmap_data = saved.data[0]["roadmap_json"]
    if isinstance(roadmap_data, str):
        roadmap_data = json.loads(roadmap_data)

    return roadmap_data


@router.get("/roadmap/completed")
def get_completed(user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = user["id"]

    try:
        res = (
            supabase
            .table("roadmap_progress")   # ✅ FIXED TABLE NAME
            .select("title")
            .eq("user_id", user_id)
            .execute()
        )
    except APIError as e:
        if "JWT expired" in str(e):
            raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
        raise HTTPException(status_code=500, detail=str(e))

    return {"completed": [r["title"] for r in (res.data or [])]}

@router.get("/stats")
def get_stats(current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    try:
        saved = _get_saved_roadmap(user_id, supabase)
        if not saved.data:
            return {"total": 0, "completed": 0, "percent": 0}

        roadmap = saved.data[0]["roadmap_json"]
        if isinstance(roadmap, str):
            roadmap = json.loads(roadmap)

        all_items = [item["title"] for phase in roadmap["phases"] for item in phase["items"]]
        total = len(all_items)

        rows = (
            supabase.table("roadmap_progress")
            .select("task_title")
            .eq("user_id", user_id)
            .execute()
        )

        completed_titles = [r["task_title"] for r in rows.data]
        completed_count = len(set(completed_titles) & set(all_items))

        percent = int((completed_count / total) * 100) if total > 0 else 0

        return {"total": total, "completed": completed_count, "percent": percent}

    except Exception as e:
        print("❌ Stats error:", e)
        return {"total": 0, "completed": 0, "percent": 0}


@router.get("/today")
def get_today_focus(current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    try:
        saved = _get_saved_roadmap(user_id, supabase)
        if not saved.data:
            return {"task": None}

        roadmap = saved.data[0]["roadmap_json"]
        if isinstance(roadmap, str):
            roadmap = json.loads(roadmap)

        rows = (
            supabase.table("roadmap_progress")
            .select("task_title")
            .eq("user_id", user_id)
            .execute()
        )

        completed_titles = set([r["task_title"] for r in rows.data])

        for phase in roadmap["phases"]:
            for item in phase["items"]:
                if item["title"] not in completed_titles:
                    return {
                        "title": item["title"],
                        "phase": phase["phase"],
                        "why": item["why"],
                        "type": item["type"],
                        "estimated_weeks": item["estimated_weeks"],
                    }

        return {"task": None}

    except Exception as e:
        print("❌ Today focus error:", e)
        return {"task": None}


@router.get("/topic")
def get_topic_detail(title: str, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]
    clean_title = title.strip().lower()

    saved = _get_saved_roadmap(user_id, supabase)
    if not saved.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    roadmap = saved.data[0]["roadmap_json"]
    if isinstance(roadmap, str):
        roadmap = json.loads(roadmap)

    for phase in roadmap["phases"]:
        for item in phase["items"]:
            if item["title"].strip().lower() == clean_title:

                cached = (
                    supabase.table("topic_ai_cache")
                    .select("*")
                    .eq("title", item["title"])
                    .limit(1)
                    .execute()
                )

                if cached.data:
                    row = cached.data[0]
                    return {
                        "title": item["title"],
                        "phase": phase["phase"],
                        "why": item.get("why", ""),
                        "estimated_weeks": item["estimated_weeks"],
                        "explanation": row["explanation"],
                        "checklist": row["checklist"],
                    }

                explanation, checklist = generate_ai_explanation(item["title"])

                supabase.table("topic_ai_cache").insert({
                    "title": item["title"],
                    "explanation": explanation,
                    "checklist": checklist,
                }).execute()

                return {
                    "title": item["title"],
                    "phase": phase["phase"],
                    "why": item.get("why", ""),
                    "estimated_weeks": item["estimated_weeks"],
                    "explanation": explanation,
                    "checklist": checklist,
                }

    raise HTTPException(status_code=404, detail="Topic not found")


@router.get("/topic/next")
def get_next_topic(title: str, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    saved = _get_saved_roadmap(user_id, supabase)
    if not saved.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    roadmap = saved.data[0]["roadmap_json"]
    if isinstance(roadmap, str):
        roadmap = json.loads(roadmap)

    flat = [{"title": item["title"], "phase": phase["phase"]} for phase in roadmap["phases"] for item in phase["items"]]

    titles = [t["title"].lower() for t in flat]
    current = title.lower()

    if current not in titles:
        raise HTTPException(status_code=404, detail="Current topic not found")

    idx = titles.index(current)

    if idx + 1 >= len(flat):
        return {"next": None}

    return {"next": flat[idx + 1]}


@router.get("/topic/chat")
def get_topic_chat(title: str, session_id: Optional[str] = None, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()

    q = (
        supabase.table("topic_chat_messages")
        .select("role, content")
        .eq("user_id", current_user["id"])
        .eq("topic_title", title)
        .order("created_at")
    )

    if session_id:
        q = q.eq("session_id", session_id)

    rows = q.execute()
    return {"messages": rows.data or []}


@router.get("/topic/chat/sessions")
def list_chat_sessions(topic_title: str, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()

    rows = (
        supabase.table("chat_sessions")
        .select("*")
        .eq("user_id", current_user["id"])
        .eq("topic_title", topic_title)
        .order("is_pinned", desc=True)
        .order("created_at", desc=True)
        .execute()
    )

    return {"sessions": rows.data or []}


@router.post("/complete")
def complete_task(body: CompleteTaskRequest, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    title = body.title
    user_id = current_user["id"]

    if not title:
        raise HTTPException(status_code=400, detail="Task title is required")

    existing = (
        supabase.table("roadmap_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("task_title", title)
        .execute()
    )

    if existing.data:
        supabase.table("roadmap_progress").delete().eq("user_id", user_id).eq("task_title", title).execute()
    else:
        supabase.table("roadmap_progress").insert({
            "user_id": user_id,
            "task_title": title,
            "completed": True
        }).execute()

    rows = (
        supabase.table("roadmap_progress")
        .select("task_title")
        .eq("user_id", user_id)
        .execute()
    )

    return {"completed": [r["task_title"] for r in rows.data]}


@router.post("/topic/ai")
async def topic_ai_chat(payload: TopicChatRequest, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()

    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages required")

    topic = payload.topic_title or payload.topic_slug or "this topic"

    system_prompt = (
        f"You are a friendly learning assistant for the topic: {topic}. "
        "Give clear, short explanations, examples, and next steps. "
        "Use bullet points when helpful."
    )

    if payload.mode == "eli5":
        system_prompt += " Explain everything like I am 5 years old. Use very simple words and short sentences."

    async def sse_stream() -> AsyncGenerator[bytes, None]:
        yield b"data: \n\n"
        await asyncio.sleep(0.05)

        messages = [{"role": "system", "content": system_prompt}] + [
            {"role": m.role, "content": m.content} for m in payload.messages
        ]

        full_response_text = ""

        stream = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            temperature=0.6,
            stream=True,
        )

        for chunk in stream:
            try:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if delta:
                    full_response_text += delta
                    yield f"data: {delta}\n\n".encode("utf-8")
                    await asyncio.sleep(0)
            except Exception as e:
                print("Streaming chunk error:", e)

        supabase.table("topic_chat_messages").insert([
            {
                "user_id": current_user["id"],
                "topic_title": topic,
                "session_id": payload.session_id,
                "role": "user",
                "content": payload.messages[-1].content,
            },
            {
                "user_id": current_user["id"],
                "topic_title": topic,
                "session_id": payload.session_id,
                "role": "assistant",
                "content": full_response_text,
            }
        ]).execute()

        if payload.session_id:
            session = (
                supabase.table("chat_sessions")
                .select("preview_title")
                .eq("id", payload.session_id)
                .single()
                .execute()
            )

            if session.data and session.data.get("preview_title") in ["New chat", None]:
                title_prompt = f"Generate a short 3-5 word title for this conversation:\n{full_response_text[:300]}"

                title_res = client.chat.completions.create(
                    model="gpt-4.1-mini",
                    messages=[{"role": "user", "content": title_prompt}],
                    temperature=0.3,
                )

                auto_title = title_res.choices[0].message.content.strip().replace('"', "")

                supabase.table("chat_sessions") \
                    .update({"preview_title": auto_title}) \
                    .eq("id", payload.session_id) \
                    .execute()

        yield b"data: [DONE]\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/topic/react")
def react_to_message(payload: dict, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()

    topic_title = payload.get("topic_title")
    message = payload.get("message")
    reaction = payload.get("reaction")

    if not topic_title or not message or reaction not in ["like", "dislike"]:
        raise HTTPException(status_code=400, detail="Invalid reaction payload")

    supabase.table("topic_chat_reactions").insert({
        "user_id": current_user["id"],
        "topic_title": topic_title,
        "message": message,
        "reaction": reaction,
    }).execute()

    return {"status": "ok", "reaction": reaction}


@router.post("/topic/chat/session")
def create_chat_session(payload: CreateChatSessionRequest, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    row = (
        supabase.table("chat_sessions")
        .insert({
            "user_id": user_id,
            "topic_title": payload.topic_title,
            "preview_title": payload.preview_title or "New chat",
        })
        .execute()
    )

    return {"session": row.data[0]}


@router.post("/topic/chat/session/pin/{session_id}")
def toggle_pin_chat_session(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    session_res = (
        supabase.table("chat_sessions")
        .select("id, is_pinned")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    is_currently_pinned = session_res.data.get("is_pinned", False)

    pinned_res = (
        supabase.table("chat_sessions")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_pinned", True)
        .execute()
    )

    pinned_count = len(pinned_res.data or [])

    if not is_currently_pinned and pinned_count >= 3:
        raise HTTPException(status_code=400, detail="You can only pin up to 3 chats.")

    new_val = not is_currently_pinned

    supabase.table("chat_sessions") \
        .update({ "is_pinned": new_val }) \
        .eq("id", session_id) \
        .eq("user_id", user_id) \
        .execute()

    return { "is_pinned": new_val }

@router.post("/init")
def init_roadmap(payload: InitRoadmapRequest, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]
    role = payload.target_role

    # Check if user already has roadmap
    existing = (
        supabase.table("user_roadmap")
        .select("id")
        .eq("user_id", user_id)
        .eq("target_role", role)
        .limit(1)
        .execute()
    )

    if existing.data:
        return {"status": "exists"}

    roadmap = generate_ai_roadmap_for_role(role)

    supabase.table("user_roadmap").upsert(
        {
            "user_id": user_id,
            "target_role": role,
            "roadmap_json": roadmap,
            "updated_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id,target_role"
    ).execute()

    return {"status": "created", "target_role": role}


@router.delete("/topic/chat/session/{session_id}")
def delete_chat_session(session_id: str, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    supabase.table("topic_chat_messages") \
        .delete() \
        .eq("session_id", session_id) \
        .eq("user_id", user_id) \
        .execute()

    supabase.table("chat_sessions") \
        .delete() \
        .eq("id", session_id) \
        .eq("user_id", user_id) \
        .execute()

    return {"status": "deleted", "session_id": session_id}


@router.delete("/topic/chat/sessions")
def delete_all_chat_sessions(topic_title: str, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    supabase.table("topic_chat_messages") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("topic_title", topic_title) \
        .execute()

    supabase.table("chat_sessions") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("topic_title", topic_title) \
        .execute()

    return {"status": "deleted_all"}


@router.put("/topic/chat/session/{session_id}")
def rename_chat_session(session_id: str, payload: RenameChatSessionRequest, current_user=Depends(get_current_user)):
    supabase = get_supabase_admin()

    supabase.table("chat_sessions") \
        .update({ "preview_title": payload.title }) \
        .eq("id", session_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    return { "status": "renamed" }