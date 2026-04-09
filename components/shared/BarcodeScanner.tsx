"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException, Result } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  RotateCcw,
  Flashlight,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string, format: string) => void;
  onError?: (error: string) => void;
  title?: string;
  description?: string;
  expectedProductId?: string;
  expectedSku?: string;
  showExpectedWarning?: boolean;
}

export type CameraError =
  | "not_found"
  | "permission_denied"
  | "not_supported"
  | "unknown";

const SUPPORTED_FORMATS = [
  "CODE_128",
  "CODE_39",
  "EAN_13",
  "EAN_8",
  "QR_CODE",
  "DATA_MATRIX",
  "UPC_A",
  "UPC_E",
  "ITF",
  "CODABAR",
];

export default function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  onError,
  title = "Quét Barcode/QR",
  description = "Đưa mã vạch vào khung scan để quét",
  expectedProductId,
  expectedSku,
  showExpectedWarning = false,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [showCameraSelect, setShowCameraSelect] = useState(false);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
    setTorchOn(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;

    stopScanning();
    setCameraError(null);
    setErrorMessage("");
    setLastScannedCode(null);
    setIsSuccess(false);

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      setAvailableCameras(cameras);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      readerRef.current = new BrowserMultiFormatReader();
      setIsScanning(true);

      const codeReader = readerRef.current;

      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current || !codeReader) return;

        try {
          const result = await codeReader.decodeFromVideoElement(videoRef.current);
          if (result) {
            handleScanResult(result);
          }
        } catch (err) {
          if (!(err instanceof NotFoundException)) {
            console.debug("Scan frame error:", err);
          }
        }

        if (isScanning && streamRef.current.active) {
          requestAnimationFrame(scanFrame);
        }
      };

      scanFrame();
    } catch (err: any) {
      console.error("Camera error:", err);
      setHasPermission(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("permission_denied");
        setErrorMessage("Quyền truy cập camera bị từ chối. Vui lòng cho phép truy cập camera trong cài đặt trình duyệt.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("not_found");
        setErrorMessage("Không tìm thấy camera. Vui lòng kết nối camera và thử lại.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError("not_found");
        setErrorMessage("Camera đang được sử dụng bởi ứng dụng khác.");
      } else {
        setCameraError("unknown");
        setErrorMessage(err.message || "Đã xảy ra lỗi khi truy cập camera.");
      }

      onError?.(errorMessage);
    }
  }, [cameraFacing, isScanning, onError, stopScanning, errorMessage]);

  const handleScanResult = useCallback(
    (result: Result) => {
      const code = result.getText();
      const format = result.getBarcodeFormat().toString();

      if (code === lastScannedCode) return;

      setLastScannedCode(code);
      setLastFormat(format);
      setIsSuccess(true);

      if (expectedSku && showExpectedWarning) {
        const productMatch = code.includes(expectedSku) || expectedSku.includes(code);
        if (!productMatch) {
          setTimeout(() => {
            setIsSuccess(false);
            setLastScannedCode(null);
          }, 2000);
          onError?.(`Sai sản phẩm! Mã quét: ${code}, Mã mong đợi: ${expectedSku}`);
          return;
        }
      }

      setTimeout(() => {
        onScan(code, format);
        stopScanning();
        onClose();
      }, 500);
    },
    [lastScannedCode, expectedSku, showExpectedWarning, onScan, stopScanning, onClose, onError]
  );

  const toggleCamera = useCallback(async () => {
    setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        const newTorchState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: newTorchState } as any],
        });
        setTorchOn(newTorchState);
      }
    } catch (err) {
      console.error("Torch not supported:", err);
    }
  }, [torchOn]);

  const toggleCameraSelect = useCallback(() => {
    setShowCameraSelect((prev) => !prev);
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    if (!videoRef.current) return;

    stopScanning();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      setCameraFacing("environment");

      readerRef.current = new BrowserMultiFormatReader();

      const codeReader = readerRef.current;
      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current || !codeReader) return;
        try {
          const result = await codeReader.decodeFromVideoElement(videoRef.current);
          if (result) {
            handleScanResult(result);
          }
        } catch (err) {
          if (!(err instanceof NotFoundException)) {
            console.debug("Scan frame error:", err);
          }
        }
        if (isScanning && streamRef.current.active) {
          requestAnimationFrame(scanFrame);
        }
      };

      scanFrame();
      setShowCameraSelect(false);
    } catch (err) {
      console.error("Switch camera error:", err);
      setCameraError("not_found");
      setErrorMessage("Không thể chuyển camera.");
    }
  }, [isScanning, stopScanning, handleScanResult]);

  const retryScanning = useCallback(() => {
    setLastScannedCode(null);
    setIsSuccess(false);
    startScanning();
  }, [startScanning]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => startScanning(), 100);
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, startScanning, stopScanning]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="relative w-full max-w-lg mx-4">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-sm text-slate-300 mt-1">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Camera View */}
        <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scan Frame */}
          {isScanning && !isSuccess && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-0"
                  style={{
                    animation: "scanLine 2s ease-in-out infinite",
                  }}
                />

                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-8 h-0.5 bg-emerald-400/50" />
                  <div className="w-0.5 h-8 bg-emerald-400/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          )}

          {/* Success overlay */}
          {isSuccess && (
            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
              <div className="bg-emerald-500 rounded-full p-4 animate-bounce">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
              <div className="absolute bottom-8 left-4 right-4 text-center">
                <Badge className="bg-emerald-500 text-white px-4 py-2 text-lg">
                  {lastScannedCode}
                </Badge>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {cameraError && !isScanning && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center p-6">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  {cameraError === "permission_denied" && "Quyền truy cập bị từ chối"}
                  {cameraError === "not_found" && "Không tìm thấy camera"}
                  {cameraError === "not_supported" && "Trình duyệt không hỗ trợ"}
                  {cameraError === "unknown" && "Đã xảy ra lỗi"}
                </h3>
                <p className="text-slate-400 mb-6">{errorMessage}</p>
                <Button
                  onClick={retryScanning}
                  className="bg-sky-500 hover:bg-sky-600"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {/* Last scanned */}
          {lastScannedCode && !isSuccess && (
            <div className="absolute bottom-24 left-4 right-4 text-center">
              <Badge className="bg-slate-800/90 text-white px-4 py-2 text-sm backdrop-blur-sm">
                <span className="text-slate-400 mr-2">Quét được:</span>
                {lastScannedCode}
                <span className="text-slate-500 ml-2 text-xs">({lastFormat})</span>
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleCameraSelect}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700/80 rounded-full w-14 h-14 backdrop-blur-sm"
              title="Chọn camera"
            >
              <Camera className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTorch}
              className={`rounded-full w-14 h-14 backdrop-blur-sm ${
                torchOn
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700/80"
              }`}
              title={torchOn ? "Tắt đèn flash" : "Bật đèn flash"}
            >
              <Flashlight className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleCamera}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700/80 rounded-full w-14 h-14 backdrop-blur-sm"
              title="Chuyển camera trước/sau"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={retryScanning}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700/80 rounded-full w-14 h-14 backdrop-blur-sm"
              title="Quét lại"
            >
              <Loader2 className="w-6 h-6" />
            </Button>
          </div>

          {/* Camera selection dropdown */}
          {showCameraSelect && availableCameras.length > 0 && (
            <div className="mt-4 bg-slate-800/95 rounded-lg p-2 max-h-48 overflow-y-auto backdrop-blur-sm">
              <p className="text-slate-400 text-xs px-2 py-1 mb-1">Chọn camera:</p>
              {availableCameras.map((camera, index) => (
                <button
                  key={camera.deviceId}
                  onClick={() => switchCamera(camera.deviceId)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-white text-sm flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {camera.label || `Camera ${index + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Supported formats hint */}
          <div className="mt-4 text-center">
            <p className="text-slate-500 text-xs">
              Hỗ trợ: CODE_128, CODE_39, EAN_13, EAN_8, QR_CODE, DATA_MATRIX
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scanLine {
          0%, 100% {
            top: 0;
            opacity: 1;
          }
          50% {
            top: calc(100% - 4px);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
