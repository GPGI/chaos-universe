"""
Document API - Endpoints for reading, writing, and modifying land ownership documents
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from typing import Optional
from io import BytesIO
from pathlib import Path
# Import DocumentHandler - make it optional
try:
    from document_handler import DocumentHandler
    DOCUMENT_HANDLER_AVAILABLE = True
except ImportError:
    try:
        from .document_handler import DocumentHandler
        DOCUMENT_HANDLER_AVAILABLE = True
    except ImportError:
        DOCUMENT_HANDLER_AVAILABLE = False
        DocumentHandler = None

router = APIRouter(prefix="/documents", tags=["documents"])


class DeedData(BaseModel):
    plot_id: int
    owner: str
    tx_hash: str
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_citizen_id: Optional[str] = None
    coordinates: Optional[str] = None
    zone_type: Optional[str] = None
    token_id: Optional[int] = None
    contract_address: Optional[str] = None
    issuer: Optional[str] = "Octa Investment Group"
    location: Optional[str] = "Star System: Sarakt, Planet: Sarakt, Octavia Capital city"


@router.get("/templates")
async def list_templates():
    """List available document templates"""
    if not DOCUMENT_HANDLER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Document handler is not available. Please install required dependencies (PyPDF2, python-docx, reportlab, qrcode[pil])"
        )
    try:
        templates = DocumentHandler.list_templates()
        return {
            "success": True,
            "templates": templates,
            "pdf_template_path": str(DocumentHandler.PDF_TEMPLATE),
            "docx_template_path": str(DocumentHandler.DOCX_TEMPLATE)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/pdf")
async def generate_pdf_deed(data: DeedData):
    """Generate PDF land ownership certificate"""
    if not DOCUMENT_HANDLER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Document handler is not available. Please install required dependencies (PyPDF2, python-docx, reportlab, qrcode[pil])"
        )
    try:
        pdf_bytes = DocumentHandler.generate_pdf_deed(
            plot_id=data.plot_id,
            owner=data.owner,
            tx_hash=data.tx_hash,
            owner_name=data.owner_name,
            owner_email=data.owner_email,
            owner_citizen_id=data.owner_citizen_id,
            coordinates=data.coordinates,
            zone_type=data.zone_type,
            token_id=data.token_id,
            contract_address=data.contract_address,
            issuer=data.issuer,
            location=data.location
        )
        
        return StreamingResponse(
            BytesIO(pdf_bytes.getvalue()),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=LandOwnershipTitleCertificate_Plot_{data.plot_id}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.post("/generate/docx")
async def generate_docx_deed(data: DeedData):
    """Generate Word document land ownership certificate"""
    if not DOCUMENT_HANDLER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Document handler is not available. Please install required dependencies (PyPDF2, python-docx, reportlab, qrcode[pil])"
        )
    try:
        docx_bytes = DocumentHandler.generate_docx_deed(
            plot_id=data.plot_id,
            owner=data.owner,
            tx_hash=data.tx_hash,
            owner_name=data.owner_name,
            owner_email=data.owner_email,
            owner_citizen_id=data.owner_citizen_id,
            coordinates=data.coordinates,
            zone_type=data.zone_type,
            token_id=data.token_id,
            contract_address=data.contract_address,
            issuer=data.issuer,
            location=data.location
        )
        
        return StreamingResponse(
            BytesIO(docx_bytes.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename=LandOwnershipTitleCertificate_Plot_{data.plot_id}.docx"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate DOCX: {str(e)}")


@router.get("/read/pdf")
async def read_pdf_template():
    """Read the PDF template (returns template info)"""
    if not DOCUMENT_HANDLER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Document handler is not available. Please install required dependencies (PyPDF2, python-docx, reportlab, qrcode[pil])"
        )
    try:
        if not DocumentHandler.PDF_TEMPLATE.exists():
            raise HTTPException(status_code=404, detail="PDF template not found")
        
        reader = DocumentHandler.read_pdf_template()
        return {
            "success": True,
            "template_path": str(DocumentHandler.PDF_TEMPLATE),
            "pages": len(reader.pages),
            "metadata": reader.metadata if hasattr(reader, 'metadata') else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/read/docx")
async def read_docx_template():
    """Read the Word template (returns template info)"""
    if not DOCUMENT_HANDLER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Document handler is not available. Please install required dependencies (PyPDF2, python-docx, reportlab, qrcode[pil])"
        )
    try:
        if not DocumentHandler.DOCX_TEMPLATE.exists():
            raise HTTPException(status_code=404, detail="Word template not found")
        
        doc = DocumentHandler.read_docx_template()
        return {
            "success": True,
            "template_path": str(DocumentHandler.DOCX_TEMPLATE),
            "paragraphs": len(doc.paragraphs),
            "tables": len(doc.tables)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

