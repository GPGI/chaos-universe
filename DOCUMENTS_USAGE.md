# Document Handler Usage Guide

This guide explains how to read, write, and modify land ownership title certificates using the documents in the `documents/` folder.

## Overview

The system supports both PDF and Word document templates:
- **PDF Template**: `documents/LandOwnershipTitleCertificate.pdf`
- **Word Template**: `documents/LandOwnershipTitleCertificate.docx`

## Installation

Install required dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Required packages:
- `PyPDF2` - For PDF manipulation
- `reportlab` - For PDF generation
- `python-docx` - For Word document manipulation
- `qrcode[pil]` - For QR code generation

## Usage Methods

### 1. Python API (DocumentHandler)

```python
from backend.document_handler import DocumentHandler

# Generate PDF deed
pdf_bytes = DocumentHandler.generate_pdf_deed(
    plot_id=42,
    owner="0x1234...",
    tx_hash="0xabcd...",
    owner_name="John Doe",
    owner_email="john@example.com",
    coordinates="Sector 5, Zone A",
    zone_type="Residential",
    contract_address="0x5678..."
)

# Save to file
DocumentHandler.save_pdf_to_file(pdf_bytes, Path("output.pdf"))

# Generate Word document
docx_bytes = DocumentHandler.generate_docx_deed(
    plot_id=42,
    owner="0x1234...",
    tx_hash="0xabcd...",
    owner_name="John Doe"
)

# Save to file
DocumentHandler.save_docx_to_file(docx_bytes, Path("output.docx"))
```

### 2. CLI Tool

```bash
# List available templates
python scripts/manage_documents.py list

# Read template information
python scripts/manage_documents.py read pdf
python scripts/manage_documents.py read docx

# Generate PDF document
python scripts/manage_documents.py generate pdf \
    --plot-id 42 \
    --owner 0x1234... \
    --tx-hash 0xabcd... \
    --owner-name "John Doe" \
    --owner-email john@example.com \
    --coordinates "Sector 5, Zone A" \
    --zone-type "Residential" \
    --output certificate.pdf

# Generate Word document
python scripts/manage_documents.py generate docx \
    --plot-id 42 \
    --owner 0x1234... \
    --tx-hash 0xabcd... \
    --owner-name "John Doe" \
    --output certificate.docx
```

### 3. REST API

Start the backend server:

```bash
cd backend
uvicorn app:app --reload
```

#### List Templates
```bash
curl http://localhost:5001/documents/templates
```

#### Generate PDF
```bash
curl -X POST http://localhost:5001/documents/generate/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "plot_id": 42,
    "owner": "0x1234...",
    "tx_hash": "0xabcd...",
    "owner_name": "John Doe",
    "owner_email": "john@example.com"
  }' \
  --output certificate.pdf
```

#### Generate Word Document
```bash
curl -X POST http://localhost:5001/documents/generate/docx \
  -H "Content-Type: application/json" \
  -d '{
    "plot_id": 42,
    "owner": "0x1234...",
    "tx_hash": "0xabcd...",
    "owner_name": "John Doe"
  }' \
  --output certificate.docx
```

## Document Fields

The following fields can be filled in:

### Required Fields
- `plot_id` - Plot ID number
- `owner` - Wallet address of owner
- `tx_hash` - Transaction hash

### Optional Fields
- `owner_name` - Owner's full name
- `owner_email` - Owner's email address
- `owner_citizen_id` - Citizen ID (if applicable)
- `coordinates` - Plot coordinates/sector
- `zone_type` - Zone type (e.g., "Residential", "Commercial")
- `token_id` - NFT token ID (defaults to plot_id)
- `contract_address` - Token contract address
- `issuer` - Issuer name (default: "Octa Investment Group")
- `location` - Location description

## Template Structure

The templates include the following sections:

1. **Unique Identifier** - Auto-generated plot identifier
2. **Owner Information** - Name, wallet, email, citizen ID
3. **Property Information** - Plot ID, coordinates, zone type, activation date
4. **Title Grant** - Legal ownership confirmation
5. **Rights and Interests** - Owner rights and obligations
6. **Blockchain Record Data** - NFT token ID, contract address, transaction hash
7. **Certification and Execution** - Official certification
8. **Legal Notice** - Legal disclaimers

## Integration with Contract Activation

When a plot is activated via the contract API, a deed is automatically generated and emailed:

```python
# In contract_api.py - automatic deed generation
pdf_buf = DeedGenerator.generate_deed(
    plot_id=plotId,
    owner=final_owner,
    tx_hash=tx_hash.hex(),
    owner_email=owner_email,
    token_id=plotId,
    contract_address=land_addr
)
```

## Reading Templates

You can read template information programmatically:

```python
# Read PDF template
pdf_reader = DocumentHandler.read_pdf_template()
print(f"Pages: {len(pdf_reader.pages)}")

# Read Word template
doc = DocumentHandler.read_docx_template()
print(f"Paragraphs: {len(doc.paragraphs)}")
print(f"Tables: {len(doc.tables)}")
```

## Modifying Templates

To modify the templates:

1. **PDF Template**: Edit `documents/LandOwnershipTitleCertificate.pdf` using a PDF editor
2. **Word Template**: Edit `documents/LandOwnershipTitleCertificate.docx` using Microsoft Word or LibreOffice

The system will automatically use the updated templates when generating new documents.

## Notes

- Templates are read from the `documents/` folder at runtime
- If templates are not found, the system falls back to simple document generation
- QR codes are automatically generated and included in documents
- All dates are automatically set to the current date
- Documents are generated in memory and can be saved to files or sent via email

