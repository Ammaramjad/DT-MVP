from dataclasses import dataclass
from io import BytesIO

import fitz
import pytesseract
from PIL import Image


@dataclass
class ExtractedPaper:
    full_text: str
    page_count: int
    title_guess: str


class PdfProcessor:
    def extract_text(self, pdf_bytes: bytes) -> ExtractedPaper:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_chunks: list[str] = []

        for page in document:
            page_text = page.get_text().strip()
            if page_text:
                text_chunks.append(page_text)
                continue

            # OCR fallback for scanned papers.
            pix = page.get_pixmap(dpi=200)
            image = Image.open(BytesIO(pix.tobytes("png")))
            ocr_text = pytesseract.image_to_string(image).strip()
            if ocr_text:
                text_chunks.append(ocr_text)

        merged = "\n\n".join(text_chunks).strip()
        lines = [line.strip() for line in merged.splitlines() if line.strip()]
        title_guess = lines[0] if lines else "Untitled Paper"
        return ExtractedPaper(full_text=merged, page_count=document.page_count, title_guess=title_guess)
