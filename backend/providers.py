import os
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def create_message(self, system: str, messages: list, max_tokens: int = 1024) -> str:
        pass


class ClaudeProvider(BaseProvider):
    def __init__(self):
        import anthropic
        self._client = anthropic.Anthropic()

    @property
    def name(self) -> str:
        return "claude"

    def create_message(self, system: str, messages: list, max_tokens: int = 1024) -> str:
        from config import get_claude_model
        response = self._client.messages.create(
            model=get_claude_model(),
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return response.content[0].text


class GeminiProvider(BaseProvider):
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in environment")
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self._genai = genai

    @property
    def name(self) -> str:
        return "gemini"

    def create_message(self, system: str, messages: list, max_tokens: int = 1024) -> str:
        from config import get_gemini_model
        if not messages:
            return ""

        model = self._genai.GenerativeModel(
            model_name=get_gemini_model(),
            system_instruction=system,
            generation_config=self._genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.7,
            ),
        )

        history = []
        for msg in messages[:-1]:
            gemini_role = "model" if msg["role"] == "assistant" else "user"
            history.append({"role": gemini_role, "parts": [msg["content"]]})

        chat = model.start_chat(history=history)
        response = chat.send_message(messages[-1]["content"])
        return response.text
