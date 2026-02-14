import { useState, useEffect, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Camera, Download, QrCode, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ProductWithBarcode {
  id: string;
  name: string;
  price_per_carton: number;
  active: boolean;
  barcode?: {
    id: string;
    barcode_number: string;
    qr_code_data: string;
  };
}

const BarcodeScanner = () => {
  const { products, productBarcodes, getProductBarcode, stock, locations } = useStore();
  const { role } = useAuth();
  const [productsWithBarcodes, setProductsWithBarcodes] = useState<ProductWithBarcode[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBarcode | null>(null);
  const [barcode, setBarcode] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [scannedProduct, setScannedProduct] = useState<ProductWithBarcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

  useEffect(() => {
    const productsData = products.map(p => ({
      ...p,
      barcode: getProductBarcode(p.id),
    }));
    setProductsWithBarcodes(productsData);
  }, [products, productBarcodes]);

  const generateQRCode = (data: any) => {
    // Simple QR code generation using a QR code API
    // In production, you'd use a library like qrcode.react
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(data))}`;
  };

  const handleGenerateBarcode = async () => {
    if (!selectedProduct || !barcode) {
      toast.error("Please select product and enter barcode");
      return;
    }

    try {
      const qrData = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        barcode_number: barcode,
        price_per_carton: selectedProduct.price_per_carton,
        generated_at: new Date().toISOString(),
      };

      const qrCodeUrl = generateQRCode(qrData);

      if (selectedProduct.barcode?.id) {
        // Update existing
        const { error } = await (supabase as any)
          .from("product_barcodes")
          .update({
            barcode_number: barcode,
            qr_code_data: JSON.stringify(qrData),
          })
          .eq("id", selectedProduct.barcode.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await (supabase as any).from("product_barcodes").insert({
          product_id: selectedProduct.id,
          barcode_number: barcode,
          qr_code_data: JSON.stringify(qrData),
        });
        if (error) throw error;
      }

      toast.success("Barcode generated successfully");
      setShowGenerateDialog(false);
      setBarcode("");
      setSelectedProduct(null);
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Error generating barcode:", error);
      toast.error("Failed to generate barcode");
    }
  };

  const handleScanProduct = async () => {
    if (!scanInput.trim()) {
      toast.error("Please enter barcode or scan a QR code");
      return;
    }

    try {
      // Try to parse as JSON (if it's QR code data)
      let scannedData = null;
      try {
        scannedData = JSON.parse(scanInput);
      } catch {
        // If not JSON, treat as barcode number
        scannedData = null;
      }

      let product = null;
      if (scannedData?.product_id) {
        product = productsWithBarcodes.find(p => p.id === scannedData.product_id);
      } else {
        product = productsWithBarcodes.find(p => p.barcode?.barcode_number === scanInput);
      }

      if (!product) {
        toast.error("Product not found");
        setScannedProduct(null);
        return;
      }

      setScannedProduct(product);
      toast.success(`Found: ${product.name}`);
    } catch (error) {
      toast.error("Error scanning product");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast.error("Camera access denied");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const downloadBarcode = (barcode: ProductWithBarcode) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(barcode.barcode?.qr_code_data || JSON.stringify({
      product_id: barcode.id,
      product_name: barcode.name,
    }))}`;
    
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `${barcode.name.replace(/\s+/g, "_")}_barcode.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Barcode & QR Management</h1>
        <p className="page-subtitle">Generate QR codes for products and scan inventory</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2">
              <QrCode className="w-4 h-4" />
              Generate Barcode
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate QR Code Barcode</DialogTitle>
              <DialogDescription>
                Create a QR code barcode for a product
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Product</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={selectedProduct?.id || ""}
                  onChange={(e) => {
                    const p = productsWithBarcodes.find(x => x.id === e.target.value);
                    setSelectedProduct(p || null);
                  }}
                >
                  <option value="">Choose a product</option>
                  {productsWithBarcodes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.active ? "Active" : "Inactive"})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">{fmt(selectedProduct.price_per_carton)}/ctn</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Barcode Number</label>
                <Input
                  placeholder="e.g., 123456789"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>

              <Button onClick={handleGenerateBarcode} className="w-full">
                Generate Barcode
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showScanDialog} onOpenChange={(open) => {
          setShowScanDialog(open);
          if (!open) stopCamera();
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Camera className="w-4 h-4" />
              Scan Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Scan Product</DialogTitle>
              <DialogDescription>
                Scan a QR code or enter barcode number
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {cameraActive ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full bg-black rounded-lg"
                  />
                  <Button onClick={stopCamera} variant="outline" className="w-full">
                    Stop Camera
                  </Button>
                </div>
              ) : (
                <Button onClick={startCamera} className="w-full gap-2">
                  <Camera className="w-4 h-4" />
                  Start Camera
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-600">Or enter manually</span>
                </div>
              </div>

              <Input
                placeholder="Enter barcode or paste QR data"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanProduct()}
              />

              <Button onClick={handleScanProduct} className="w-full">
                Scan Product
              </Button>

              {scannedProduct && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      Found: {scannedProduct.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Price:</strong> {fmt(scannedProduct.price_per_carton)}/carton</p>
                    <p><strong>Barcode:</strong> {scannedProduct.barcode?.barcode_number || "N/A"}</p>
                    <div>
                      <p className="font-medium mb-2">Stock Levels:</p>
                      <div className="space-y-1">
                        {locations.map(loc => {
                          const qty = stock.find(s => s.product_id === scannedProduct.id && s.location_id === loc.id)?.cartons || 0;
                          return (
                            <div key={loc.id} className="flex justify-between text-xs">
                              <span>{loc.name}:</span>
                              <span className="font-semibold">{qty} ctns</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barcodes List */}
      <Card>
        <CardHeader>
          <CardTitle>Product Barcodes</CardTitle>
          <CardDescription>View and download QR codes for products</CardDescription>
        </CardHeader>
        <CardContent>
          {productsWithBarcodes.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">No products available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productsWithBarcodes.map(product => (
                <Card key={product.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <CardDescription>{fmt(product.price_per_carton)}/carton</CardDescription>
                      </div>
                      {product.active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {product.barcode ? (
                      <>
                        <div className="bg-gray-100 p-4 rounded flex items-center justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(product.barcode.qr_code_data)}`}
                            alt="QR Code"
                            className="max-w-full"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-600">Barcode Number</p>
                          <p className="font-mono font-semibold">{product.barcode.barcode_number}</p>
                        </div>
                        <Button
                          onClick={() => downloadBarcode(product)}
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download QR Code
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded">
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600 mb-3">No barcode generated</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowGenerateDialog(true);
                          }}
                        >
                          Generate Now
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">About QR Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Each QR code contains product information and can be scanned using any smartphone camera.
          </p>
          <p>
            Print these QR codes and attach them to your inventory for quick scanning during stock checks and sales.
          </p>
          <p>
            The scanner feature allows you to instantly view product details and current stock levels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BarcodeScanner;
