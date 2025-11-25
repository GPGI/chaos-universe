import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Download, 
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  Wallet,
  Loader2
} from "lucide-react";
import { useDigitalID } from "@/hooks/useDigitalID";
import { useWallet } from "@/contexts/WalletContext";
import { generateDeedPDF } from "@/lib/deedPdf";
import { toast } from "sonner";

export default function PurchaseConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address } = useWallet();
  const { digitalID, hasDigitalID, loading: idLoading, checkDigitalID } = useDigitalID();
  
  const plotId = searchParams.get("plotId");
  const txHash = searchParams.get("txHash");
  const price = searchParams.get("price");
  const currency = searchParams.get("currency") || "AVAX";
  const [generatingDeed, setGeneratingDeed] = useState(false);

  useEffect(() => {
    if (address) {
      checkDigitalID();
    }
  }, [address, checkDigitalID]);

  const handlePrintDeed = async () => {
    if (!plotId || !address) {
      toast.error("Missing information for deed generation");
      return;
    }

    setGeneratingDeed(true);
    try {
      // Generate deed PDF
      const pdfBytes = await generateDeedPDF(
        "https://via.placeholder.com/800x600.pdf", // Template URL - replace with actual template
        {
          plotId: plotId,
          owner: address,
          location: `Sarakt Prime - Plot #${plotId}`,
          price: parseFloat(price || "0"),
          date: new Date().toLocaleDateString(),
          ipfs: `ipfs://QmSarakt/${plotId}.json`
        }
      );

      // Create blob and download
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deed-plot-${plotId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Deed downloaded successfully!");
    } catch (error: any) {
      console.error("Error generating deed:", error);
      toast.error("Failed to generate deed PDF");
    } finally {
      setGeneratingDeed(false);
    }
  };

  if (!plotId || !txHash) {
    return (
      <div className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="glass p-8 text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-3xl font-bold mb-4">Invalid Purchase Data</h1>
            <p className="text-muted-foreground mb-6">
              Missing purchase information. Please try purchasing again.
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Purchase Confirmation</h1>
        </div>

        {/* Digital ID Status */}
        <Card className={hasDigitalID ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {idLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : hasDigitalID ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-yellow-500" />
                )}
                Digital ID Status
              </CardTitle>
              {hasDigitalID ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="outline" className="border-blue-500 text-blue-500">
                  Optional
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {idLoading ? (
              <p className="text-muted-foreground">Checking Digital ID...</p>
            ) : hasDigitalID ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {digitalID?.firstName} {digitalID?.lastName}
                  </span>
                </div>
                {digitalID?.email && (
                  <div className="text-sm text-muted-foreground">
                    {digitalID.email}
                  </div>
                )}
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  ✓ Your Digital ID is active. Your plot purchase is confirmed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  A Digital ID is optional but recommended for enhanced features and identity verification.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/digital-id?redirect=/purchase-confirmation", { 
                    state: { plotId, txHash, price, currency } 
                  })}
                >
                  <User className="h-4 w-4 mr-2" />
                  Create Digital ID (Optional)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Details */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Purchase Successful
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Plot ID
                    </div>
                    <p className="text-xl font-bold">#{plotId}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      Price Paid
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {price} {currency}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Purchase Date
                    </div>
                    <p className="text-lg font-medium">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      Transaction Hash
                    </div>
                    <p className="text-sm font-mono break-all">
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-primary/20 space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Status: <Badge className="bg-green-500">Payment Received - Pending Activation</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your plot purchase has been recorded. An admin will activate your plot and mint the NFT deed shortly.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Plot automatically added to your Primary Portfolio</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deed Print Section */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Land Deed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Download your official land deed document. This deed proves your ownership of the plot on-chain.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="cosmic"
                    onClick={handlePrintDeed}
                    disabled={generatingDeed}
                    className="gap-2"
                  >
                    {generatingDeed ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download Deed PDF
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/financial-hub")}
                  >
                    View in Portfolio
                  </Button>
                </div>
              </CardContent>
            </Card>
      </div>
    </div>
  );
}

