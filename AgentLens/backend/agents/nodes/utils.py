from typing import List, Dict, Any
import httpx
from bs4 import BeautifulSoup

async def fetch_page_text(url: str, max_chars: int = 6000) -> str:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, follow_redirects=True)
            r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        # remove scripts/styles
        for tag in soup(["script", "style", "noscript"]):
            tag.extract()

        text = " ".join(soup.get_text().split())
        return text[:max_chars]
    except Exception:
        return ""

