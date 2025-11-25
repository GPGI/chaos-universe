import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import axios from "axios";

export async function generateDeedPDF(templateUrl: string, data: {
  plotId: string;
  owner: string;
  location: string;
  price: number;
  date: string;
  ipfs: string;
}) {
  const existingPdfBytes = await axios.get(templateUrl, { responseType: 'arraybuffer' }).then(res => res.data);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const firstPage = pdfDoc.getPages()[0];

  firstPage.drawText(`Plot ID: ${data.plotId}`, { x: 50, y: 450, size: 12, font, color: rgb(0,0,0) });
  firstPage.drawText(`Owner: ${data.owner}`, { x: 50, y: 430, size: 12, font, color: rgb(0,0,0) });
  firstPage.drawText(`Location: ${data.location}`, { x: 50, y: 410, size: 12, font, color: rgb(0,0,0) });
  firstPage.drawText(`Price: ${data.price} xBGL`, { x: 50, y: 390, size: 12, font, color: rgb(0,0,0) });
  firstPage.drawText(`Date: ${data.date}`, { x: 50, y: 370, size: 12, font, color: rgb(0,0,0) });
  firstPage.drawText(`Deed IPFS: ${data.ipfs}`, { x: 50, y: 350, size: 10, font, color: rgb(0,0,0) });

  return await pdfDoc.save();
}

