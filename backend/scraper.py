import re
import logging
import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify

logger = logging.getLogger(__name__)

_REMOVE_TAGS = ["script", "style", "nav", "footer", "header", "aside", "noscript"]
_MAX_CHARS = 8000


async def fetch_and_clean(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; CareerBot/1.0)"})
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(_REMOVE_TAGS):
            tag.decompose()

        markdown = markdownify(str(soup), heading_style="ATX", strip=["a"])
        markdown = re.sub(r"\n{3,}", "\n\n", markdown)
        markdown = markdown.strip()

        return markdown[:_MAX_CHARS]

    except Exception as exc:
        logger.warning("scraper: failed to fetch %s — %s", url, exc)
        return ""


if __name__ == "__main__":
    import asyncio

    async def _smoke():
        result = await fetch_and_clean("https://example.com")
        print(f"Fetched {len(result)} chars")
        print(result[:500])

    asyncio.run(_smoke())
