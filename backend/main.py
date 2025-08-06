from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv
import json
import requests
from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware

# Middleware для корректной обработки Origin на Render
class FixOriginMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Если заголовок Origin отсутствует (особенность Render),
        # мы не можем выполнить стандартную проверку CORS.
        # В этом случае мы доверяем запросу, так как он пришел через внутреннюю сеть.
        if "origin" not in request.headers:
            # Создаем "безопасную" копию заголовков
            mutable_headers = request.scope["headers"]
            # Искусственно добавляем заголовок, который точно будет в списке origins
            # Это позволяет CORSMiddleware ниже успешно обработать запрос
            mutable_headers.append((b"origin", b"https://cloved-quest-frontend.onrender.com"))
        
        response = await call_next(request)
        return response

# Загружаем переменные окружения из .env файла
dotenv_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

app = FastAPI()
app.add_middleware(FixOriginMiddleware) # Добавляем наш "исправляющий" middleware

# Настраиваем CORS
origins = [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://cloved-quest-frontend.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Устанавливаем API ключи из переменных окружения
openai.api_key = os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# --- Модели Pydantic ---

class Message(BaseModel):
    text: str
    model: str = "gpt-4.1"
    context: dict = {}

class AutogenRequest(BaseModel):
    prompt: str

class SelfImproveRequest(BaseModel):
    task: str

class OrchestrateRequest(BaseModel):
    text: str
    model: str = "gpt-4.1"
    context: dict = {}

class TTSRequest(BaseModel):
    text: str

# --- Логика Эндпоинтов ---

@app.post("/api/chat")
async def chat_with_ai(message: Message):
    if not openai.api_key:
        return {"error": "API-ключ OpenAI не был загружен."}
    try:
        context_str = json.dumps(message.context, indent=2, ensure_ascii=False)
        system_prompt = (f"Ты — умный ассистент. Вот контекст со страницы:\n\n{context_str}\n\nИспользуй его.")
        completion = openai.chat.completions.create(
            model=message.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message.text}
            ]
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        return {"error": f"Ошибка OpenAI: {e}"}

@app.post("/api/autogen_chat")
async def start_manual_autogen_chat(req: AutogenRequest):
    if not openai.api_key:
        return {"error": "API-ключ OpenAI не был загружен."}
    conversation_history, current_prompt, max_turns = [], req.prompt, 3
    try:
        for i in range(max_turns):
            coder_response = openai.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": "Ты 'Coder'."}, {"role": "user", "content": current_prompt}])
            coder_text = coder_response.choices[0].message.content
            conversation_history.append({"sender": "Coder", "text": coder_text})
            manager_prompt = (f"Ты 'Product_Manager'. Проанализируй ответ от 'Coder'-а и дай фидбэк.\n\nОтвет:\n```\n{coder_text}\n```")
            manager_response = openai.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": "Ты 'Product_Manager'."}, {"role": "user", "content": manager_prompt}])
            manager_text = manager_response.choices[0].message.content
            conversation_history.append({"sender": "Product_Manager", "text": manager_text})
            if i < max_turns - 1:
                current_prompt = f"Твой предыдущий ответ:\n```\n{coder_text}\n```\nФидбэк от Менеджера:\n\n{manager_text}\n\nИсправь ответ."
        return {"conversation": conversation_history}
    except Exception as e:
        return {"error": f"Ошибка OpenAI: {e}"}

@app.post("/api/self_improve")
async def handle_self_improvement(req: SelfImproveRequest):
    if not openai.api_key:
        return {"error": "API-ключ OpenAI не был загружен."}
    PROMPT_FILE = "worker_prompt.txt"
    try:
        try:
            with open(PROMPT_FILE, "r", encoding="utf-8") as f:
                initial_prompt = f.read()
        except FileNotFoundError:
            initial_prompt = "Ты - AI ассистент."
        worker_response = openai.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": initial_prompt}, {"role": "user", "content": req.task}])
        worker_result = worker_response.choices[0].message.content
        critic_prompt = f"Ты - 'Critic'. Оцени ответ 'Worker'-а на задачу: '{req.task}'. Ответ:\n\n{worker_result}"
        critic_response = openai.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": "Ты - 'Critic'."}, {"role": "user", "content": critic_prompt}])
        critic_feedback = critic_response.choices[0].message.content
        engineer_prompt = f"Ты - 'Prompt Engineer'. Улучши системный промпт. Изначальный: '{initial_prompt}'. Задача: '{req.task}'. Результат: '{worker_result}'. Критика: '{critic_feedback}'. Напиши ТОЛЬКО новый промпт."
        engineer_response = openai.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": "Ты - 'Prompt Engineer'."}, {"role": "user", "content": engineer_prompt}])
        new_prompt = engineer_response.choices[0].message.content
        with open(PROMPT_FILE, "w", encoding="utf-8") as f:
            f.write(new_prompt)
        return {"initial_prompt": initial_prompt, "worker_result": worker_result, "critic_feedback": critic_feedback, "new_prompt": new_prompt}
    except Exception as e:
        return {"error": "Не удалось выполнить цикл улучшения."}

async def classify_intent(text: str):
    system_prompt = """
You are a request router. Your job is to classify the user's request into one of three categories based on their intent. Respond ONLY with the category name. The categories are:
1. 'simple_chat': For simple questions, greetings, or requests for information that can be answered directly.
2. 'agent_dialogue': For requests that imply a creative or development process followed by a review.
3. 'self_improve': For meta-requests to improve the AI's own underlying instructions or prompts.
User Request: "{text}"
""".strip()
    try:
        completion = openai.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": system_prompt.format(text=text)}], temperature=0)
        intent = completion.choices[0].message.content.strip().lower().replace("'", "").replace("\"", "")
        if intent not in ['simple_chat', 'agent_dialogue', 'self_improve']:
            return 'simple_chat'
        return intent
    except Exception:
        return 'simple_chat'

@app.post("/api/orchestrate")
async def orchestrate_chat(req: OrchestrateRequest):
    intent = await classify_intent(req.text)
    print(f"==> Оркестратор: Обнаружено намерение '{intent}' для задачи: '{req.text[:50]}...'")
    try:
        if intent == 'agent_dialogue':
            response_data = await start_manual_autogen_chat(AutogenRequest(prompt=req.text))
            if "error" in response_data:
                raise Exception(response_data["error"])
            return {"type": "conversation", "data": response_data["conversation"]}
        elif intent == 'self_improve':
            response_data = await handle_self_improvement(SelfImproveRequest(task=req.text))
            if "error" in response_data:
                raise Exception(response_data["error"])
            return {"type": "report", "data": response_data}
        else:
            response_data = await chat_with_ai(Message(text=req.text, model=req.model, context=req.context))
            if "error" in response_data:
                raise Exception(response_data["error"])
            return {"type": "chat", "data": response_data["response"]}
    except Exception as e:
        return {"type": "error", "data": str(e)}

@app.post("/api/text-to-speech")
async def text_to_speech(req: TTSRequest):
    if not ELEVENLABS_API_KEY:
        return {"error": "Ключ API ElevenLabs не настроен."}
    try:
        VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream"
        headers = { "Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": ELEVENLABS_API_KEY }
        data = { "text": req.text, "model_id": "eleven_multilingual_v2" }
        response = requests.post(tts_url, json=data, headers=headers, stream=True)
        response.raise_for_status()
        return StreamingResponse(response.iter_content(chunk_size=1024), media_type="audio/mpeg")
    except Exception as e:
        print(f"Ошибка в /api/text-to-speech: {e}")
        return {"error": "Не удалось сгенерировать речь."}

@app.post("/api/speech-to-text")
async def speech_to_text(audio_file: UploadFile = File(...)):
    if not openai.api_key:
        return {"error": "API-ключ OpenAI не был загружен."}
    file_path = f"temp_{audio_file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await audio_file.read())

        with open(file_path, "rb") as audio:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio
            )
        return {"text": transcript.text}
    except Exception as e:
        print(f"Ошибка в /api/speech-to-text: {e}")
        return {"error": "Не удалось распознать речь."}
    finally:
        # Удаляем временный файл после использования
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/")
def read_root():
    return {"status": "Сервер запущен"} 