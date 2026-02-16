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

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

print("OPENAI_API_KEY loaded:", bool(os.getenv("OPENAI_API_KEY")))

class CompleteTaskRequest(BaseModel):
    title: str

router = APIRouter(prefix="/roadmap", tags=["roadmap"])
supabase = get_supabase_admin()

TARGET_ROLE = "Junior Frontend Developer"

class ChatMsg(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class TopicChatRequest(BaseModel):
    topic_title: Optional[str] = None
    topic_slug: Optional[str] = None
    messages: List[ChatMsg]
    mode: Optional[str] = None

# ======================
# Helpers
# ======================

def _get_saved_roadmap(user_id: str):
    return (
        supabase.table("user_roadmap")
        .select("roadmap_json")
        .eq("user_id", user_id)
        .eq("target_role", TARGET_ROLE)
        .limit(1)
        .execute()
    )

def _save_roadmap(user_id: str, roadmap_dict: dict):
    payload = {
        "user_id": user_id,
        "target_role": TARGET_ROLE,
        "roadmap_json": roadmap_dict,
        "updated_at": datetime.utcnow().isoformat(),
    }

    return (
        supabase.table("user_roadmap")
        .upsert(payload, on_conflict="user_id,target_role")
        .execute()
    )

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

        # 🔥 Extract JSON safely if model adds text
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
    
def _generate_roadmap():
    return {
        "target_role": TARGET_ROLE,
        "phases": [
            {
                "phase": "Phase 1: Foundations",
                "description": "Build strong fundamentals in web development.",
                "items": [
                    {
                        "title": "HTML & CSS Basics",
                        "type": "course",
                        "estimated_weeks": 2,
                        "why": "You need solid layout and styling skills."
                    },
                    {
                        "title": "JavaScript Fundamentals",
                        "type": "course",
                        "estimated_weeks": 3,
                        "why": "JS is core to frontend logic."
                    }
                ]
            },
            {
                "phase": "Phase 2: React",
                "description": "Learn modern frontend development with React.",
                "items": [
                    {
                        "title": "React Basics",
                        "type": "course",
                        "estimated_weeks": 3,
                        "why": "React is industry standard."
                    },
                    {
                        "title": "Build a small React app",
                        "type": "project",
                        "estimated_weeks": 2,
                        "why": "Projects prove your skills."
                    }
                ]
            }
        ]
    }

# ======================
# Routes
# ======================

@router.get("")
def get_roadmap(current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    saved = _get_saved_roadmap(user_id)

    if saved.data:
        roadmap_data = saved.data[0]["roadmap_json"]
        if isinstance(roadmap_data, str):
            roadmap_data = json.loads(roadmap_data)
    else:
        roadmap_data = _generate_roadmap()
        _save_roadmap(user_id, roadmap_data)

    return roadmap_data


@router.get("/completed")
def get_completed(current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    rows = (
        supabase.table("roadmap_progress")
        .select("task_title")
        .eq("user_id", user_id)
        .execute()
    )

    return {"completed": [r["task_title"] for r in rows.data]}


@router.get("/stats")
def get_stats(current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    try:
        saved = _get_saved_roadmap(user_id)
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
    user_id = current_user["id"]

    try:
        saved = _get_saved_roadmap(user_id)
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
    user_id = current_user["id"]
    clean_title = title.strip().lower()

    saved = _get_saved_roadmap(user_id)
    if not saved.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    roadmap = saved.data[0]["roadmap_json"]
    if isinstance(roadmap, str):
        roadmap = json.loads(roadmap)

    for phase in roadmap["phases"]:
        for item in phase["items"]:
            if item["title"].strip().lower() == clean_title:

                # ✅ Check cache
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

                # 🤖 Generate AI
                explanation, checklist = generate_ai_explanation(item["title"])

                # 💾 Cache result
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
    user_id = current_user["id"]

    saved = _get_saved_roadmap(user_id)
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
def get_topic_chat(title: str, current_user=Depends(get_current_user)):
    rows = (
        supabase.table("topic_chat_messages")
        .select("role, content")
        .eq("user_id", current_user["id"])
        .eq("topic_title", title)
        .order("created_at")
        .execute()
    )

    return {"messages": rows.data or []}

@router.post("/complete")
def complete_task(body: CompleteTaskRequest, current_user=Depends(get_current_user)):
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
async def topic_ai_chat(
    payload: TopicChatRequest,
    current_user=Depends(get_current_user)
):
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages required")

    topic = payload.topic_title or payload.topic_slug or "this topic"  # ✅ OK

    system_prompt = (
        f"You are a friendly learning assistant for the topic: {topic}. "
        "Give clear, short explanations, examples, and next steps. "
        "Use bullet points when helpful."
    )

    if payload.mode == "eli5":  # ✅ OK (your ELI5 mode stays)
        system_prompt += " Explain everything like I am 5 years old. Use very simple words and short sentences."

    async def sse_stream() -> AsyncGenerator[bytes, None]:
        yield b"data: \n\n"
        await asyncio.sleep(0.05)

        messages = [{"role": "system", "content": system_prompt}] + [
            {"role": m.role, "content": m.content} for m in payload.messages
        ]

        full_response_text = ""  # 🔧 CHANGE: collect full AI response

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
                    full_response_text += delta  # 🔧 CHANGE: append streamed text
                    yield f"data: {delta}\n\n".encode("utf-8")
                    await asyncio.sleep(0)
            except Exception as e:
                print("Streaming chunk error:", e)

        # 🔧 CHANGE: persist BOTH user + assistant messages
        supabase.table("topic_chat_messages").insert([
            {
                "user_id": current_user["id"],
                "topic_title": topic,  # 🔧 CHANGE: use resolved topic (not payload.topic_title)
                "role": "user",
                "content": payload.messages[-1].content,
            },
            {
                "user_id": current_user["id"],
                "topic_title": topic,  # 🔧 CHANGE
                "role": "assistant",
                "content": full_response_text,  # 🔧 CHANGE: save streamed result
            }
        ]).execute()

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
def react_to_message(
    payload: dict,
    current_user=Depends(get_current_user)
):
    topic_title = payload.get("topic_title")
    message = payload.get("message")
    reaction = payload.get("reaction")

    if not topic_title or not message or reaction not in ["like", "dislike"]:
        raise HTTPException(status_code=400, detail="Invalid reaction payload")

    # Upsert reaction (like/dislike toggle)
    supabase.table("topic_chat_reactions").insert({
    "user_id": current_user["id"],
    "topic_title": payload.topic_title,
    "message": payload.message,
    "reaction": payload.reaction,
}).execute()
    return {"status": "ok", "reaction": reaction}