#!/usr/bin/env python3
"""
CLI tool for reading, writing, and modifying land ownership title documents
"""
import sys
import argparse
from pathlib import Path
from io import BytesIO

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.document_handler import DocumentHandler


def main():
    parser = argparse.ArgumentParser(description="Manage land ownership title documents")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # List templates
    subparsers.add_parser("list", help="List available templates")
    
    # Read template
    read_parser = subparsers.add_parser("read", help="Read template information")
    read_parser.add_argument("type", choices=["pdf", "docx"], help="Template type")
    
    # Generate document
    gen_parser = subparsers.add_parser("generate", help="Generate a new document")
    gen_parser.add_argument("type", choices=["pdf", "docx"], help="Output format")
    gen_parser.add_argument("--plot-id", type=int, required=True, help="Plot ID")
    gen_parser.add_argument("--owner", required=True, help="Owner wallet address")
    gen_parser.add_argument("--tx-hash", required=True, help="Transaction hash")
    gen_parser.add_argument("--owner-name", help="Owner name")
    gen_parser.add_argument("--owner-email", help="Owner email")
    gen_parser.add_argument("--owner-citizen-id", help="Owner citizen ID")
    gen_parser.add_argument("--coordinates", help="Plot coordinates/sector")
    gen_parser.add_argument("--zone-type", help="Zone type")
    gen_parser.add_argument("--token-id", type=int, help="NFT token ID")
    gen_parser.add_argument("--contract-address", help="Token contract address")
    gen_parser.add_argument("--output", "-o", help="Output file path")
    gen_parser.add_argument("--issuer", default="Octa Investment Group", help="Issuer name")
    gen_parser.add_argument("--location", default="Star System: Sarakt, Planet: Sarakt, Octavia Capital city", help="Location")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == "list":
            templates = DocumentHandler.list_templates()
            print("Available Templates:")
            print(f"  PDF Template: {'✓' if templates['pdf_template'] else '✗'}")
            print(f"  DOCX Template: {'✓' if templates['docx_template'] else '✗'}")
            print(f"  Documents Folder: {'✓' if templates['documents_folder'] else '✗'}")
            if templates['pdf_template']:
                print(f"\nPDF Template: {DocumentHandler.PDF_TEMPLATE}")
            if templates['docx_template']:
                print(f"DOCX Template: {DocumentHandler.DOCX_TEMPLATE}")
        
        elif args.command == "read":
            if args.type == "pdf":
                reader = DocumentHandler.read_pdf_template()
                print(f"PDF Template: {DocumentHandler.PDF_TEMPLATE}")
                print(f"Pages: {len(reader.pages)}")
                if hasattr(reader, 'metadata') and reader.metadata:
                    print(f"Title: {reader.metadata.get('/Title', 'N/A')}")
                    print(f"Author: {reader.metadata.get('/Author', 'N/A')}")
            elif args.type == "docx":
                doc = DocumentHandler.read_docx_template()
                print(f"DOCX Template: {DocumentHandler.DOCX_TEMPLATE}")
                print(f"Paragraphs: {len(doc.paragraphs)}")
                print(f"Tables: {len(doc.tables)}")
        
        elif args.command == "generate":
            # Generate document
            if args.type == "pdf":
                doc_bytes = DocumentHandler.generate_pdf_deed(
                    plot_id=args.plot_id,
                    owner=args.owner,
                    tx_hash=args.tx_hash,
                    owner_name=args.owner_name,
                    owner_email=args.owner_email,
                    owner_citizen_id=args.owner_citizen_id,
                    coordinates=args.coordinates,
                    zone_type=args.zone_type,
                    token_id=args.token_id,
                    contract_address=args.contract_address,
                    issuer=args.issuer,
                    location=args.location
                )
                ext = ".pdf"
            else:  # docx
                doc_bytes = DocumentHandler.generate_docx_deed(
                    plot_id=args.plot_id,
                    owner=args.owner,
                    tx_hash=args.tx_hash,
                    owner_name=args.owner_name,
                    owner_email=args.owner_email,
                    owner_citizen_id=args.owner_citizen_id,
                    coordinates=args.coordinates,
                    zone_type=args.zone_type,
                    token_id=args.token_id,
                    contract_address=args.contract_address,
                    issuer=args.issuer,
                    location=args.location
                )
                ext = ".docx"
            
            # Save to file
            if args.output:
                output_path = Path(args.output)
            else:
                output_path = Path(f"LandOwnershipTitleCertificate_Plot_{args.plot_id}{ext}")
            
            if args.type == "pdf":
                DocumentHandler.save_pdf_to_file(doc_bytes, output_path)
            else:
                DocumentHandler.save_docx_to_file(doc_bytes, output_path)
            
            print(f"✓ Generated {args.type.upper()} document: {output_path}")
            print(f"  Plot ID: {args.plot_id}")
            print(f"  Owner: {args.owner}")
            print(f"  Transaction: {args.tx_hash}")
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

