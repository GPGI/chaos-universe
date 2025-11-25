"""
Deed Generator - Legacy compatibility wrapper for DocumentHandler
Use DocumentHandler directly for more features.
"""
from typing import Optional
from io import BytesIO

# Import the new document handler
try:
    from .document_handler import DocumentHandler
except ImportError:
    from document_handler import DocumentHandler

class DeedGenerator:
    """
    Legacy deed generator - now uses DocumentHandler internally.
    For new code, use DocumentHandler directly.
    """
    
    @staticmethod
    def generate_qr(data: str) -> BytesIO:
        """Generate QR code image as BytesIO"""
        return DocumentHandler.generate_qr(data)

    @staticmethod
    def generate_deed(
        plot_id: int,
        owner: str,
        tx_hash: str,
        owner_name: Optional[str] = None,
        owner_email: Optional[str] = None,
        owner_citizen_id: Optional[str] = None,
        coordinates: Optional[str] = None,
        zone_type: Optional[str] = None,
        token_id: Optional[int] = None,
        contract_address: Optional[str] = None
    ) -> BytesIO:
        """
        Generate land ownership title certificate using template from documents folder.
        This is a compatibility wrapper around DocumentHandler.generate_pdf_deed()
        """
        return DocumentHandler.generate_pdf_deed(
            plot_id=plot_id,
            owner=owner,
            tx_hash=tx_hash,
            owner_name=owner_name,
            owner_email=owner_email,
            owner_citizen_id=owner_citizen_id,
            coordinates=coordinates,
            zone_type=zone_type,
            token_id=token_id,
            contract_address=contract_address
        )