import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify as md

async def fetch_and_clean_html(url: str) -> str:
    """Fetches a URL, cleans the HTML, and returns Markdown."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")

    # Remove unwanted tags
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    # Get the main content if possible (heuristic)
    main_content = soup.find("main") or soup.find("article") or soup.body
    
    # Convert to Markdown
    markdown = md(str(main_content), heading_style="ATX")
    
    return markdown.strip()
